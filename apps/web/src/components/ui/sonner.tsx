/**
 * Toasts, themed from the document rather than from a theme provider, because
 * the class on <html> is the single source of truth here (see theme-toggle).
 */
import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast: "bg-card text-card-foreground border rounded-lg text-sm",
          description: "text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
