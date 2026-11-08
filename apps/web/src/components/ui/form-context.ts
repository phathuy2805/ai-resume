import { createContext, useContext } from 'react';

// Tách khỏi form.tsx: file component chỉ nên export component để React Fast Refresh
// cập nhật nóng được (rule react-refresh/only-export-components).

/** Tên field hiện tại, do <FormField> cung cấp cho các thành phần bên trong. */
export const FormFieldContext = createContext<{ name: string } | null>(null);

/** Lấy thông tin field hiện tại. Chỉ dùng bên trong <FormField>. */
export function useFormField() {
  const field = useContext(FormFieldContext);
  if (!field) throw new Error('useFormField must be used within FormField');
  return field;
}
