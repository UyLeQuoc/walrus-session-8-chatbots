import { createContext, useContext, useEffect, useState } from "react";

type Shell = {
  title: string;
  setTitle: (title: string) => void;
  newChatTick: number;
  requestNewChat: () => void;
};

export const ShellContext = createContext<Shell | null>(null);

export function useShellTitle(title: string) {
  const shell = useContext(ShellContext);
  useEffect(() => {
    shell?.setTitle(title);
  }, [shell, title]);
}

export function useNewChatTick(): number {
  return useContext(ShellContext)?.newChatTick ?? 0;
}

export function useShellState() {
  const [title, setTitle] = useState("hippo");
  const [newChatTick, setNewChatTick] = useState(0);
  return { title, setTitle, newChatTick, setNewChatTick };
}
