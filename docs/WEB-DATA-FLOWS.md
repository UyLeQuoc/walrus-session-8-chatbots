# Luồng dữ liệu của hippo trên web

Tài liệu này mô tả **hành vi đang có trong code**, theo thao tác người dùng trên web. `docs/ARCHITECTURE.md` trình bày thiết kế tổng thể, nhưng một số đoạn trong đó là kế hoạch cũ; khi khác nhau, mã nguồn được dẫn dưới đây là căn cứ. Phạm vi gồm giao diện web, các lệnh gõ trong web chat, API mà web gọi, và dữ liệu đi qua PostgreSQL, OpenRouter, Walrus Memory relayer, Sui và Walrus. Telegram/Discord/Slack dùng chung một phần logic server nhưng không được mô tả theo từng màn hình ở đây.

## 1. Bản đồ thành phần và dữ liệu

```text
Trình duyệt: React/Vite, ví Sui, cookie hoặc header định danh
       │ /api/* (dev: Vite proxy; production Vercel: rewrite)
       ▼
Hono server ── PostgreSQL: người dùng, định danh, phiên, token,
       │                    delegate key mã hóa, metadata bộ nhớ, lượt chat, team
       ├──── OpenRouter: model tạo câu trả lời
       ├──── Walrus Memory relayer: remember, recall, metadata, sponsor
       └──── Sui: MemWalAccount, owner, delegate keys, giao dịch ví
                              └──── Walrus: blob bộ nhớ đã mã hóa
```

| Nơi lưu | Có gì | Không có gì |
|---|---|---|
| PostgreSQL | `people`, `channel_identities`, `web_sessions`, `connect_tokens`, `delegate_keys`, `memory_index`, `turn_log`, team và lời mời. `memory_index` giữ account, namespace, blob/job ID, trạng thái, loại, SHA-256, thời gian. | Không lưu nguyên văn memory hay transcript chat. `turn_log` chỉ ghi metadata của lượt chat và blob đã được đưa vào prompt. |
| Walrus Memory | Nội dung từng memory, qua relayer để ghi/tìm lại; blob mã hóa nằm trên Walrus. | Không phải database phiên đăng nhập web. |
| Sui | MemWalAccount, địa chỉ chủ sở hữu, danh sách delegate key và các giao dịch cấp/thu hồi quyền. | Không chứa văn bản memory dưới dạng giao diện đọc được. |
| Trình duyệt | `useChat` giữ các tin nhắn đang hiển thị; cookie guest/session khi cùng origin; `localStorage` giữ theme và ID/session dự phòng khi khác origin. | Không nhận `MEMWAL_PRIVATE_KEY` hay private key delegate do server tạo. |

Nguồn: [schema](../packages/db/src/schema.ts), [định danh web](../apps/server/src/routes/chat.ts), [client web](../apps/web/src/lib/api.ts), [memory port](../packages/memory/src/port.ts).

### Mỗi người dùng được chọn bộ nhớ thế nào?

1. Lượt chat đầu tiên không có session hợp lệ: server tạo guest ID ngẫu nhiên, đặt cookie `hippo_guest`, tạo `people` và `channel_identities` nếu chưa tồn tại. Lần sau cookie đó tìm lại cùng `person`.
2. Guest dùng **cùng account và delegate key của server** (`MEMWAL_ACCOUNT_ID`, `MEMWAL_PRIVATE_KEY`) nhưng namespace riêng `hippo-guest:<personId>`.
3. Nếu đã đăng nhập ví, `hippo_session` hợp lệ được ưu tiên hơn guest cookie. Owned mode dùng MemWalAccount của người dùng, delegate key riêng lưu mã hóa trong PostgreSQL, namespace `hippo` trong account đó. Khi đọc, server còn tìm memory guest cũ của chính người đó và memory team nếu có; lần ghi thông thường chỉ vào account owned.
4. `hippo-team:<teamId>` nằm trong account của server; chỉ `/team remember` ghi vào đó. Thành viên đọc team memory cùng với memory cá nhân.

Namespace guest là cách ứng dụng phân luồng, **không phải khóa truy cập độc lập**: delegate key chung của server có thể truy cập các namespace trong account server. [Code chọn scope](../apps/server/src/identity/persons.ts), [định nghĩa namespace](../packages/memory/src/client.ts).

## 2. Vào web, định danh và giao diện ban đầu

| Thao tác / màn hình | Luồng dữ liệu thực tế |
|---|---|
| Mở `/` | `ChatPage` gọi `GET /api/config` để lấy `operatorAccountId` cho link Sui; `Landing`/`LiveStats` gọi `GET /api/stats`. Server đọc số memory `stored`, số `personId` có hàng trong `memory_index`, cache kết quả 60 giây. Chưa tạo `person` chỉ vì mở trang. |
| Điều hướng | `BrowserRouter` có `/` (chat), `/me`, `/connect/:token`, `/disconnect/:token` và trang 404. `Layout` chứa navigation. |
| Theme sáng/tối | `ThemeToggle` đọc lựa chọn `hippo.theme` từ `localStorage`, nếu chưa có thì theo hệ điều hành; đổi theme chỉ sửa class CSS và `localStorage`, không gọi server. |
| Cùng origin / khác origin | Mặc định web gọi `/api/*` cùng origin qua Vite proxy hoặc Vercel rewrite, dùng cookie `HttpOnly`, `SameSite=Lax`. Nếu `VITE_API_URL` trỏ sang origin khác, `identityHeaders()` gửi `x-hippo-guest`/`x-hippo-session` từ `localStorage`; server chỉ nhận header có định dạng hợp lệ. Đây là đường dự phòng cho host không proxy được. |

Nguồn: [routes web](../apps/web/src/main.tsx), [stats](../apps/server/src/routes/connect.ts), [theme](../apps/web/src/components/theme-toggle.tsx), [API URL và identity](../apps/web/src/lib/api.ts), [Vite proxy](../apps/web/vite.config.ts).

## 3. Gửi tin nhắn, trả lời và ghi nhớ

```text
Người dùng nhập tin / chọn gợi ý
  → ChatPage.useChat gửi POST /api/chat (messages)
  → server nhận diện person từ wallet session hoặc guest cookie/header
  → giới hạn độ dài và lượt dùng; nếu là /command thì xử lý lệnh
  → chọn MemoryPort guest/owned (+ guest cũ/team để đọc)
  → gatherContext gọi recall theo câu hỏi, profile/style/commitment đầu phiên,
    rồi correction khi cần
  → runTurn đưa memory phù hợp vào prompt và stream model OpenRouter
  → model có thể gọi tool recall hoặc remember
  → web hiển thị chữ, trạng thái tool và memory đã dùng kèm blob ID
```

- `ChatPage` giữ transcript trong state của `useChat`, gửi từng lượt qua `DefaultChatTransport`, hiển thị token streaming, lỗi bằng toast và các memory đã recall ngay dưới câu trả lời. Reload làm mất transcript đang hiển thị; `Examples` có nút lưu sẵn câu hỏi vào `sessionStorage`, reload rồi đặt lại câu hỏi vào ô nhập. Nó không tự gửi câu hỏi sau reload. [ChatPage](../apps/web/src/features/chat/chat-page.tsx), [Examples](../apps/web/src/features/chat/examples.tsx).
- `POST /api/chat` xác định người dùng, kiểm tra tin quá dài, giới hạn tần suất, thử `handleCommand` trước. Lệnh được trả lời trực tiếp, không gọi model. Tin thường đi vào `portFor` → `gatherContext` → `runTurn`. Server stream AI SDK UI messages về web; metadata đầu câu trả lời gồm loại, text, relevance và blob ID của memory đã đưa vào prompt. Khi xong, `logTurn` ghi metadata vào `turn_log`. [Chat route](../apps/server/src/routes/chat.ts), [agent](../packages/core/src/agent.ts).
- `gatherContext` bỏ qua memory khi `memoryEnabled=false`. Khi bật, nó tìm theo tối đa 300 ký tự đầu của câu hỏi; đầu phiên còn tìm profile/style/commitment; khi có dữ kiện liên quan thì tìm thêm correction. Kết quả được lọc, gộp và sắp theo thời gian trước khi đưa vào prompt. Lỗi recall được ghi log; lượt chat vẫn có thể tiếp tục. [Agent](../packages/core/src/agent.ts).
- `runTurn` gọi model chính qua OpenRouter và cấp hai tool `remember`, `recall` cho model khi memory bật. `recall` là tìm bổ sung do model yêu cầu. **Web stream không tự chuyển sang fallback model** nếu stream lỗi; đường non-streaming của các kênh khác có fallback. [Model](../packages/core/src/model.ts), [tools](../packages/core/src/tools.ts), [agent](../packages/core/src/agent.ts).
- Khi tool `remember` chạy: server che các chuỗi giống credential → định dạng `[type] [by] [#channel] [date] text` → kiểm tra trùng (correction chỉ so với correction) → gửi job tới relayer → ghi hàng `memory_index` trạng thái `pending` → trả lời chat ngay → theo dõi job nền rồi cập nhật `stored` + blob ID hoặc `failed`. Vì vậy “remembering” chưa đồng nghĩa đã có blob trên Walrus. `recall` lọc memory đã bị ẩn và thử lại khi relayer báo đã bỏ toàn bộ kết quả. [Memory port](../packages/memory/src/port.ts), [chính sách ghi/tìm](../packages/memory/src/policy.ts), [indexWrites](../apps/server/src/identity/persons.ts).

## 4. Các thao tác trên `/me`

Trang `/me` gọi `GET /api/me` và `GET /api/me/memories` song song. Nếu chưa có guest cookie/session, API trả `anonymous`; web mời chat trước hoặc ký ví. Nếu có `person`, trang hiển thị mode, trạng thái memory, số hàng `stored`, namespace và các panel dưới đây. [MePage](../apps/web/src/features/me/me-page.tsx), [routes](../apps/server/src/routes/chat.ts).

| Chức năng web | UI → server → nguồn dữ liệu / kết quả |
|---|---|
| Xem account trên Sui | `ChainPanel` → `GET /api/me/account` → server chọn account của người dùng nếu owned, account operator nếu guest → `readAccount` trực tiếp từ Sui → owner và delegate keys. Nếu chain không đọc được, UI vẫn có link explorer và báo `unreadable`. |
| Xem danh sách memory | `MemoryList` nhận `GET /api/me/memories` → `memory_index` lọc `personId` và bỏ team namespace, tối đa 100 hàng mới nhất → relayer metadata bổ sung ngày hết hạn nếu lấy được. Danh sách chỉ có loại, trạng thái, ngày, kênh, blob ID/link, không có nội dung text. Filter theo loại chạy hoàn toàn trong React, không gọi API. |
| Tìm nội dung memory | Ô search → `GET /api/me/search?q=...` → `portFor().recall` từ Walrus Memory, tối đa 8 kết quả; có thể gồm memory team. Server tra `memory_index` để đánh dấu `mine`; chỉ kết quả `mine` có nút ẩn. Nếu relayer lỗi, trả 502. |
| Ẩn / dùng lại một memory | Nút `hide`/`use again` → `POST /api/me/memories/visibility` với `blobId`, `hidden` → server kiểm tra memory thuộc `person`, cập nhật `memory_index.hidden_at` → port lọc blob đó khỏi recall và dedupe → trang nạp lại danh sách. Blob mã hóa trên Walrus vẫn còn; client Walrus khác không nhận bộ lọc của hippo. |
| Xem team | `TeamPanel` → `GET /api/me/team` → membership + tối đa 50 hàng `memory_index` thuộc `hippo-team:<teamId>`. Chỉ hiển thị metadata và cờ `mine`, không tên thành viên hoặc text. Nếu chưa có team, panel chỉ hướng dẫn lệnh chat. |
| Mời thành viên | Nút `Invite` → `POST /api/me/team/invite` → server tạo mã một lần, hạn 10 phút trong `team_invites` → UI cho copy `/team join <code>`. |
| Rời team | Nút rời rồi xác nhận → `POST /api/me/team/leave` → `team_members.left_at` được cập nhật → trang nạp lại. Memory đã đóng góp vẫn ở team. |
| Xuất memory | Hai nút tải `.md`/`.json` → `GET /api/me/export?format=md|json` → server đọc hàng `memory_index`, thử tìm lại text qua Walrus theo từng type, so SHA-256 với hash đã ghi, bổ sung expiry nếu lấy được → trả file mới tạo cho browser. File ghi rõ text nào chưa khôi phục/kiểm chứng; server không lưu file. Export gồm hàng team do chính người này thêm, nhưng không phải toàn bộ memory của team. |
| Bắt đầu cấp/thu hồi quyền | Nút trong `ChainPanel` → `POST /api/me/connect` hoặc `/api/me/disconnect` → server tạo link token → browser chuyển sang `/connect/:token` hoặc `/disconnect/:token`. Xem mục 5. |
| Đăng nhập bằng ví | `WalletSignIn` → challenge/signature/session, xem mục 6. |
| Đăng xuất | `POST /api/auth/signout` xóa web session trong PostgreSQL và cookie; web xóa session header dự phòng, nạp lại `/me`. Guest cookie vẫn còn, nên trang có thể quay về guest của cùng browser. |
| Hướng dẫn Claude Code | Chỉ hiển thị các bước và nút copy; không tự cài plugin hay gọi API. |

Nguồn UI: [MePage](../apps/web/src/features/me/me-page.tsx), [MemoryList](../apps/web/src/features/me/memory-list.tsx), [ChainPanel](../apps/web/src/features/me/chain-panel.tsx), [TeamPanel](../apps/web/src/features/me/team-panel.tsx), [ExportPanel](../apps/web/src/features/me/export-panel.tsx). Nguồn server: [chat routes](../apps/server/src/routes/chat.ts), [exportFor](../apps/server/src/memory/export-person.ts), [export logic](../apps/server/src/memory/export.ts), [teams](../apps/server/src/identity/teams.ts).

## 5. Kết nối ví để sở hữu memory và thu hồi quyền

### Connect

1. Từ `/me` hoặc lệnh `/connect` trong chat, server gọi `startConnect`: tạo delegate keypair riêng cho `person`, mã hóa private key bằng `KEY_ENCRYPTION_KEY` trong `delegate_keys` trạng thái `pending`, tạo `connect_tokens` một lần dùng, hạn 10 phút. Browser chỉ nhận **public key** và link; private key không được gửi về web.
2. `/connect/:token` tải `GET /api/connect/:token` và `GET /api/config` để lấy public key, label, network, package/registry ID và relayer URL. Người dùng kết nối ví Sui.
3. Web tìm MemWalAccount của địa chỉ ví trong Sui registry. Nếu chưa có, ví ký giao dịch `create_account`; tiếp theo ký `add_delegate_key` cho public key của hippo. `sponsorAndExecute` thử relayer sponsor trước; nếu sponsor không dùng được, web báo và cho ví tự trả gas khi có thể.
4. Web gửi `POST /api/connect/:token/done` với account ID và digest. Server **đọc lại object trên Sui** để kiểm tra delegate key đã được thêm và lấy owner thật; không tin địa chỉ ví trong body. Nếu chain chưa cập nhật, web retry khi nhận 409.
5. Server đổi `people.mode` sang `owned`, gắn account và wallet identity, kích hoạt delegate key. Chat thường sau đó ghi **mới** vào account của người dùng, namespace `hippo`; memory guest cũ vẫn ở account operator và được đọc kèm, **không di chuyển**.

### Disconnect

1. `/me` hoặc `/disconnect` tạo token trỏ đến active delegate key; `/disconnect/:token` cho ví ký `remove_delegate_key` trên Sui, cũng ưu tiên sponsor.
2. Callback `/done` xác nhận key đã biến mất khỏi account trên chain; server đặt key `revoked`, xóa bản private key mã hóa khỏi hàng dữ liệu và chuyển `people.mode` về `guest`.
3. Từ đó hippo không đọc account owned qua key đã thu hồi; memory guest có trước vẫn có thể được hippo đọc. Không blob nào bị xóa. Người dùng có thể connect lại bằng một key mới.

Nguồn: [connect page](../apps/web/src/features/connect/connect-page.tsx), [giao dịch Sui](../apps/web/src/features/connect/memwal.ts), [sponsor/fallback](../apps/web/src/features/connect/sponsor.ts), [tạo token/key](../apps/server/src/connect/tokens.ts), [xác nhận chain](../apps/server/src/routes/connect.ts), [chọn port](../apps/server/src/identity/persons.ts).

## 6. Đăng nhập ví để mở cùng memory trên web

Đây là **ký một thông điệp để nhận diện**, khác với giao dịch connect/revoke ở mục 5.

```text
WalletSignIn → POST /api/auth/challenge
  → server lưu nonce một lần dùng trong connect_tokens (5 phút)
  → ví ký thông điệp
  → POST /api/auth/verify {nonce, signature}
  → server khôi phục địa chỉ ví từ signature, dùng nonce, tìm/tạo person theo wallet
  → tạo web_sessions (30 ngày), đặt cookie hippo_session
  → các request sau ưu tiên session này trước guest cookie
```

Sign out xóa hàng session. Ở code hiện tại, route `/api/auth/verify` **không truyền guest person ID vào `signInWithWallet`**, nên chỉ ký ví từ một guest browser không tự gộp memory guest đó vào wallet person. Luồng `/connect` có cơ chế gộp identity khi xác nhận account; `/link` cũng là cách gộp các kênh có điều kiện. [WalletSignIn](../apps/web/src/features/me/wallet-signin.tsx), [auth routes](../apps/server/src/routes/auth.ts), [auth logic](../apps/server/src/identity/auth.ts).

## 7. Lệnh có thể gõ ngay trong web chat

Mọi lệnh dưới đây đi qua `POST /api/chat`, `handleCommand` xử lý trên server và trả text trực tiếp; chúng không phải route REST riêng (ngoại trừ các nút `/me` được nêu ở trên). [Command handler](../apps/server/src/chat/commands.ts).

| Lệnh | Dữ liệu đi đâu / kết quả |
|---|---|
| `/start`, `/help`, `/privacy` | Trả nội dung hướng dẫn/chính sách từ server, không gọi model. |
| `/whoami` | `people`, `memory_index`, và thử đọc stats của namespace từ relayer; trả mode, namespace, account/wallet nếu có, số memory. |
| `/memory` | Đọc tối đa 30 hàng memory cá nhân mới nhất trong PostgreSQL, trả loại/ngày/blob/trạng thái; không có nội dung text. |
| `/memory search <q>` | Recall nội dung qua Walrus Memory, trả text, relevance và blob ID. |
| `/memory off` / `/memory on` | Cập nhật `people.memory_enabled`; khi off, lượt chat sau không recall, không có tool remember/recall; memory cũ không bị xóa. |
| `/memory forget <blob>` / `/memory unhide <blob>` | Đặt/xóa `memory_index.hidden_at` cho đúng memory cá nhân; hippo ngừng/dùng lại memory đó, blob vẫn ở Walrus. |
| `/memory forget all` | Gọi relayer `forget` cho các namespace cá nhân đang đọc (owned, guest cũ, guest kế thừa), rồi xóa các hàng index cá nhân. Memory team giữ nguyên; blob mã hóa vẫn còn đến khi hết hạn lưu trữ. |
| `/proof` | Đọc `turn_log` của câu trả lời thường gần nhất trên kênh web; liệt kê blob mà câu đó đã dùng. Không tự xác minh lại nội dung blob ở thời điểm gọi. |
| `/export` | Tạo export như nút `/me`; web chat trả lời hướng dẫn tải trên `/me`, không đính kèm file vào khung chat. |
| `/connect` / `/disconnect` | Tạo key/token hoặc token thu hồi và trả link tới trang ví; thay đổi on-chain chỉ xảy ra sau khi người dùng ký trên trang đó. |
| `/link` / `/link <code>` | Tạo mã một lần dùng 10 phút để gộp định danh giữa các kênh, hoặc đổi mã để gộp. Bên đổi mã có memory sẵn bị từ chối để tránh đưa dữ liệu cho người phát mã. |
| `/team`, `/team new <name>`, `/team join <code>`, `/team invite`, `/team leave` | Đọc/tạo team, membership và lời mời trong PostgreSQL; join/invite qua mã một lần dùng. Rời team không xóa dữ liệu đã chia sẻ. |
| `/team remember <fact>` | Gọi `teamPortFor` và ghi một memory loại `decision` vào `hippo-team:<teamId>` trong account operator; không tự chia sẻ câu chat thường. |

Lệnh `/memory <cụm khác>` được xử lý như tìm kiếm với chính cụm đó. Lệnh bắt đầu `/` nhưng không khớp trả help, không gửi cho model. [Command handler](../apps/server/src/chat/commands.ts), [link](../apps/server/src/identity/link.ts), [team](../apps/server/src/identity/teams.ts).

## 8. Những ranh giới quan trọng khi đọc workflow

- **Guest riêng theo logic ứng dụng, không riêng theo account/key.** Mọi guest chia sẻ operator key; `personId` quyết định namespace. Owned account mới có account/key delegate riêng. [Scopes](../packages/memory/src/client.ts), [portFor](../apps/server/src/identity/persons.ts).
- **`pending` khác `stored`.** Lệnh ghi trả về sau khi relayer nhận job; blob ID chỉ có khi job nền hoàn tất. `/me` cho thấy `pending` hoặc `failed`. [Memory port](../packages/memory/src/port.ts).
- **Ẩn khác xóa.** Nút hide và `/memory forget <blob>` chỉ là bộ lọc của hippo. `/memory forget all` bỏ kết quả khỏi search index nhưng không xóa blob Walrus. [Commands](../apps/server/src/chat/commands.ts).
- **Export không bảo đảm khôi phục toàn bộ text.** Metadata có trong `memory_index`; text chỉ lấy lại được nếu semantic recall tìm thấy, và hash chỉ đánh dấu dòng nào đúng với bản đã ghi. [Export](../apps/server/src/memory/export.ts).
- **Web không có lịch sử transcript phía server để tải lại.** Sau reload, giao diện không hiển thị lại hội thoại cũ; tính năng memory là các fact đã được ghi và được tìm lại, không phải lưu nguyên cuộc chat. [ChatPage](../apps/web/src/features/chat/chat-page.tsx), [schema](../packages/db/src/schema.ts).
- **Nút xem ciphertext/explorer chỉ mở URL bên ngoài.** Không có endpoint web giải mã trực tiếp một blob theo ID. [MemoryList](../apps/web/src/features/me/memory-list.tsx).

## 9. Đối chiếu endpoint

Đây là toàn bộ route HTTP mà Hono đăng ký trong `apps/server/src/routes`. Các luồng ở mục 2–7 giải thích phần người dùng web tương tác; hai health endpoint phục vụ kiểm tra vận hành, không có nút riêng trên web.

| Nhóm | Endpoint | Vai trò |
|---|---|---|
| Chat | `POST /api/chat` | Lệnh hoặc lượt chat streaming. |
| Trang đầu | `GET /api/config`, `GET /api/stats` | Cấu hình public cho ví và số liệu hiển thị. |
| Tài khoản | `GET /api/me`, `GET /api/me/account` | Thông tin person/session và account đọc từ Sui. |
| Memory | `GET /api/me/memories`, `GET /api/me/search`, `POST /api/me/memories/visibility`, `GET /api/me/export` | Liệt kê metadata, tìm text, ẩn/hiện, tải file. |
| Team | `GET /api/me/team`, `POST /api/me/team/invite`, `POST /api/me/team/leave` | Xem, mời, rời team. Tạo/join/ghi team đi qua lệnh chat. |
| Connect | `POST /api/me/connect`, `POST /api/me/disconnect`, `GET /api/connect/:token`, `POST /api/connect/:token/done` | Tạo link; trang ví tải token và xác nhận giao dịch. |
| Sign-in | `POST /api/auth/challenge`, `POST /api/auth/verify`, `POST /api/auth/signout` | Challenge, kiểm tra chữ ký, session. |
| Vận hành | `GET /api/health`, `GET /api/health/deep` | Health đơn giản và kiểm tra sâu PostgreSQL/relayer; web không gọi. |

Nguồn: [đăng ký route](../apps/server/src/index.ts), [chat routes](../apps/server/src/routes/chat.ts), [connect routes](../apps/server/src/routes/connect.ts), [auth routes](../apps/server/src/routes/auth.ts), [health routes](../apps/server/src/routes/health.ts).
