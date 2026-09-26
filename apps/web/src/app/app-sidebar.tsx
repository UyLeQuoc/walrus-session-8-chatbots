import { Library, SquarePen, Trash2 } from "lucide-react";
import { Link } from "react-router";
import { WalletAccount } from "@/app/wallet-account";
import { Logo } from "@/components/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useConversations } from "@/features/chat/use-conversations";

export function AppSidebar({
  onNewChat,
  onOpenChat,
  activeChatId,
}: {
  onNewChat: () => void;
  onOpenChat: (id: string) => void;
  activeChatId: string | null;
}) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { items, remove } = useConversations();

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <Link to="/" className="flex items-center rounded-md px-2 py-1.5">
          <Logo variant={collapsed ? "mark" : "lockup"} wordSize={18} />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton type="button" onClick={onNewChat}>
                  <SquarePen />
                  <span>New chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/me">
                    <Library />
                    <span>My memory</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {!collapsed && items.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Chats</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      type="button"
                      isActive={item.id === activeChatId}
                      onClick={() => onOpenChat(item.id)}
                    >
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      aria-label={`Delete ${item.title}`}
                      showOnHover
                      onClick={() => {
                        void remove(item.id).then((ok) => {
                          if (ok && item.id === activeChatId) onNewChat();
                        });
                      }}
                    >
                      <Trash2 />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <WalletAccount />
      </SidebarFooter>
    </Sidebar>
  );
}
