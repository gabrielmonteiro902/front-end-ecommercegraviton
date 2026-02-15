import "../index.css"
import Form from "../components/form";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { api } from "../services/api";



export default function WelcomePage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [isLogin, setIsLogin] = useState<boolean>();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    const endpoint = isLogin ? '/login' : '/admins';

    const payload = isLogin
      ? { email_admin: userEmail, password_admin: userPassword }
      : { name_admin: userName, email_admin: userEmail, password_admin: userPassword };

    try {
      const response = await api.post(endpoint, payload);
      
      console.log(isLogin ? "Login ok!" : "Cadastro ok!")

      login(response.data);
      navigate("/graviton-home")

    } catch (err) {
      const error = err as AxiosError<{error: string}>;
      console.log("Erro na autenticação:", error.response?.data?.error || "Erro de conexão");
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-black">
      {/* Header original preservado */}
      <div className="items-start justify-start px-12 py-8">
        <h1 className="font-bold text-white tracking-tighter">
          WELCOME TO GRAVITON SERVICES<span className="text-gray-600">.</span>
        </h1>
      </div>

      {/* Área do Formulário Híbrido */}
      <div className="flex flex-1 items-center justify-center p-6">
        <Form 
          title={isLogin ? "Entrar na Conta" : "Criar Novo Admin"} 
          buttonLabel={isLogin ? "Acessar Sistema" : "Finalizar Cadastro"}
          onSubmit={handleAuth}
        >
          {/* CAMPO DINÂMICO: Só aparece se o modo NÃO for Login */}
          {!isLogin && (
            <Form.Input
              label="Nome Completo"
              placeholder="Digite seu nome completo..."
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
          )}

          <Form.Input
            label="E-mail"
            type="email"
            placeholder="admin@graviton.com"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
          />

          <Form.InputPassword
            label="Senha"
            placeholder="*******"
            value={userPassword}
            onChange={(e) => setUserPassword(e.target.value)}
          />

          {/* BOTÃO DE ALTERNÂNCIA (Toggle) */}
          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-gray-500 hover:text-white transition-all cursor-pointer underline underline-offset-4"
            >
              {isLogin 
                ? 'Ainda não tem um acesso? Cadastre-se aqui' 
                : 'Já possui uma conta? Voltar para o login'}
            </button>
          </div>
        </Form>
      </div>
    </div>
  )
}