import "../index.css"
import Form from "../components/form";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function WelcomePage() {
  
  const navigate = useNavigate();
  const { login } = useAuth();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data, error } = await supabase
      .from('admins')
      .insert([
        {
          name_admin: userName,
          email_admin: userEmail,
          password_admin: userPassword
        }
      ])
      .select()
      .single()

    if (error) {
      console.log("Não foi possivel o cadastro por que", error.message)
    } if (data) {
      login(data)
      navigate( "/graviton-home")
      console.log("Admin cadastrado e logado com sucesso!")
      
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col  bg-black">
      <div className="items-start justify-start px-12 py-8">
        <h1 className="text-3xl font-bold text-white">
          WELCOME TO GRAVITON SERVICES
        </h1>
      </div>

      <div>
        return (
        <div className="flex min-h-screen items-center justify-center bg-black">
          <Form title="Cadastra-se" onSubmit={handleRegister}>
            <Form.Input
              label="Nome Completo"
              placeholder="Seu nome completo..."
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
            <Form.Input
              label="E-mail"
              placeholder="emailexemplo123@gmail.com"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
            />
            <Form.InputPassword
              label="Senha"
              placeholder="*******"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
            />

          </Form>
        </div>
        );
      </div>
    </div>

  )
}