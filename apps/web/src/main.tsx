import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import "./index.css";
import { Layout } from "./components/layout";
import { ChatPage } from "./pages/chat";
import { ConnectPage } from "./pages/connect";
import { MePage } from "./pages/me";

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ChatPage />} />
          <Route path="connect/:token" element={<ConnectPage kind="connect" />} />
          <Route path="disconnect/:token" element={<ConnectPage kind="disconnect" />} />
          <Route path="me" element={<MePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
