import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import React from 'react';

const buttonVariants = cva(
    // Ditambahkan efek active:scale untuk feedback klik yang memuaskan
    'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100',
    {
        variants: {
            variant: {
                default: 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 hover:shadow',
                destructive:
          'bg-rose-500 text-white shadow-sm hover:bg-rose-600 hover:shadow',
                outline:
          'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300',
                secondary:
          'bg-slate-100 text-slate-800 hover:bg-slate-200',
                ghost: 'hover:bg-slate-100 hover:text-slate-900',
                link: 'text-indigo-600 underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-10 px-4 py-2',
                sm: 'h-9 rounded-md px-3',
                lg: 'h-11 rounded-xl px-8 text-base',
                icon: 'h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
        <Comp
            className={cn(buttonVariants({ variant, size, className }))}
            ref={ref}
            {...props}
        />
    );
});
Button.displayName = 'Button';

export { Button, buttonVariants };