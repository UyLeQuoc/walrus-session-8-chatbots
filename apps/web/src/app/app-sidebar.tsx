import { Library, SquarePen } from "lucide-react";
import { Link } from "react-router";
import { WalletAccount } from "@/app/wallet-account";
import { Logo } from "@/components/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar({ onNewChat }: { onNewChat: () => void }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

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
      </SidebarContent>
      <SidebarFooter>
        <WalletAccount />
      </SidebarFooter>
    </Sidebar>
  );
}
