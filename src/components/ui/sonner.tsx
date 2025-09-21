import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-gradient-to-br group-[.toaster]:from-card/90 group-[.toaster]:to-background/90 group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:backdrop-blur-sm',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:hover:bg-primary/90',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:hover:bg-muted/80',
          success:
            'group-[.toaster]:bg-gradient-to-br group-[.toaster]:from-green-500/20 group-[.toaster]:to-green-600/10 group-[.toaster]:border-green-500/50 group-[.toaster]:text-green-50',
          error:
            'group-[.toaster]:bg-gradient-to-br group-[.toaster]:from-red-500/20 group-[.toaster]:to-red-600/10 group-[.toaster]:border-red-500/50 group-[.toaster]:text-red-50',
          warning:
            'group-[.toaster]:bg-gradient-to-br group-[.toaster]:from-amber-500/20 group-[.toaster]:to-amber-600/10 group-[.toaster]:border-amber-500/50 group-[.toaster]:text-amber-50',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
