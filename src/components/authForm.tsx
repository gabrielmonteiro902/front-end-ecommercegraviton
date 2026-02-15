import React, { useState } from 'react';
import type {FormEvent} from 'react';
import axios, { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import Form from './form'; 
import { api } from '../services/api';

interface FormData {
  name: string;
  email: string;
  password: string;
}

const AuthForm = () => {
  // Estado para saber se estamos no modo Login ou Cadastro
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: ''
  });
  
  const navigate = useNavigate();

  // Função para atualizar os campos do formulário
  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Define a rota baseada no modo atual
    const endpoint = isLogin ? '/login' : '/admins';
    
    // Prepara os dados conforme o Go espera (campos com _admin)
    const payload = isLogin 
      ? { email_admin: formData.email, password_admin: formData.password }
      : { name_admin: formData.name, email_admin: formData.email, password_admin: formData.password };

    try {
      const response = await api.post(endpoint, payload);
      console.log('Sucesso:', response.data.message);
      
      // Se deu certo, o cookie já está no navegador. Vamos para a Home!
      navigate('/graviton-home'); 
      
    } catch (err) {
      const error = err as AxiosError<{ error: string }>;
      console.error('Erro na autenticação:', error.response?.data?.error || 'Erro de conexão');
    }
  };

  return (
    <Form 
      title={isLogin ? "Login" : "Cadastra-se"} 
      buttonLabel={isLogin ? "Acessar Sistema" : "Finalizar Cadastro"}
      onSubmit={handleSubmit}
    >
      {/* Campo de Nome: Só aparece se estivermos cadastrando */}
      {!isLogin && (
        <Form.Input
          label="Nome Completo"
          placeholder="Seu nome completo..."
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
        />
      )}

      <Form.Input
        label="E-mail"
        type="email"
        placeholder="emailexemplo123@gmail.com"
        value={formData.email}
        onChange={(e) => handleChange('email', e.target.value)}
      />

      <Form.InputPassword
        label="Senha"
        placeholder="*******"
        value={formData.password}
        onChange={(e) => handleChange('password', e.target.value)}
      />

      {/* Botão de alternância entre Login e Cadastro */}
      <div className="mt-2 text-center">
        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="text-sm text-gray-500 hover:text-white transition-all cursor-pointer underline underline-offset-4"
        >
          {isLogin ? 'Não tem uma conta? Clique aqui' : 'Já possui conta? Faça o login'}
        </button>
      </div>
    </Form>
  );
};

export default AuthForm;