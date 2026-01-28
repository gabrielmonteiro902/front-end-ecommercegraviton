import React, { type ReactNode, type FormEvent } from "react";

interface InputProps {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const InputField = ({ label, type = "text", placeholder, value, onChange }: InputProps) => (
  <div className="flex flex-col gap-2 w-full">
    <label className="text-sm font-medium text-gray-400">{label}</label>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="rounded-lg border border-gray-800 bg-gray-950 p-3 text-white outline-none focus:border-gray-200 transition-all placeholder:text-gray-600"
    />
  </div>
);

interface InputPasswordProps {
    label: string;
    type?: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }
  
  const InputPasswordField = ({ label, type = "password", placeholder, value, onChange }: InputProps) => (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-sm font-medium text-gray-400">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="rounded-lg border border-gray-800 bg-gray-950 p-3 text-white outline-none focus:border-gray-200 transition-all placeholder:text-gray-600"
      />
    </div>
  );

interface FormProps {
  title: string;
  buttonLabel?: string;
  onSubmit: (e: FormEvent) => void;
  children: ReactNode;
}

export default function FormularioAgendamento({ title, buttonLabel = "Confirmar", onSubmit, children }: FormProps) {
  return (
    <form 
      onSubmit={onSubmit}
      className="flex w-full max-w-md flex-col gap-6 rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-2xl"
    >
      <header>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <div className="mt-2 h-1 w-12 bg-gray-600 rounded-full" />
      </header>

      <div className="flex flex-col gap-4">
        {children}
      </div>

      <button
        type="submit"
        className="mt-2 w-full rounded-lg bg-white py-3 font-bold text-black hover:bg-gray-500 hover:cursor-pointer active:scale-95 transition-all"
      >
        {buttonLabel}
      </button>
    </form>
  );
}

FormularioAgendamento.Input = InputField;
FormularioAgendamento.InputPassword = InputPasswordField