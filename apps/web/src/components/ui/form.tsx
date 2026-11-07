import { createContext, useContext, type ReactNode, type ComponentProps } from "react";
import { type FieldPath, type FieldValues, FormProvider, useFormState, Controller, type ControllerProps } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const FormFieldContext = createContext<{ name: string } | null>(null);
export function Form<T extends FieldValues>(props: ComponentProps<typeof FormProvider<T>>) { return <FormProvider {...props} />; }
export function FormField<T extends FieldValues, TName extends FieldPath<T>>(props: ControllerProps<T, TName>) { return <FormFieldContext.Provider value={{ name: props.name }}><Controller {...props} /></FormFieldContext.Provider>; }
export function FormItem({ className, ...props }: import("react").HTMLAttributes<HTMLDivElement>) { return <div className={cn("space-y-2", className)} {...props} />; }
export function FormLabel(props: ComponentProps<typeof Label>) { return <Label {...props} />; }
export function FormControl({ children }: { children: ReactNode }) { return <>{children}</>; }
export function FormMessage() {
  const field = useContext(FormFieldContext);
  const { errors } = useFormState();
  const message = field?.name ? (errors[field.name]?.message as string | undefined) : undefined;
  return message ? <p className="text-sm font-medium text-destructive">{message}</p> : null;
}
export function useFormField() { const field = useContext(FormFieldContext); if (!field) throw new Error("useFormField must be used within FormField"); return field; }
