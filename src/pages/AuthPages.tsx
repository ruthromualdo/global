import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, KeyRound, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import { authService } from '../services/authService';

export const LoginPage: React.FC = () => {
  const { loginDemo } = useAppStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('marina.costa@participante.exemplo.br');
  const [password, setPassword] = useState('••••••••••••');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await loginDemo(email);
    setLoading(false);
    navigate('/app/dashboard');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="tutu-card p-6 sm:p-8 space-y-6">
        <div className="space-y-2 text-center">
          <span className="px-3 py-1 rounded-full bg-tutu-secondary/40 text-tutu-lime text-xs font-bold uppercase tracking-wider">
            Acesso Demonstrativo
          </span>
          <h1 className="font-display font-bold text-3xl text-tutu-light">Entrar na Plataforma</h1>
          <p className="text-xs text-tutu-light/75">
            Navegação demonstrativa do Desafio Global Summit 2026 (sem autenticação em servidor nesta etapa).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-tutu-light/80 mb-1.5">
              E-mail do Participante
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-tutu-light/50 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-tutu pl-10 text-sm"
                placeholder="seu.email@exemplo.br"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-tutu-light/80">
                Senha
              </label>
              <Link to="/recuperar-senha" className="text-xs text-tutu-lime hover:underline">
                Esqueceu a senha?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-tutu-light/50 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-tutu pl-10 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 btn-tutu-lime text-sm flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Acessando...' : 'Entrar no Desafio Global'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-tutu-secondary/40 text-center space-y-2 text-xs">
          <p className="text-tutu-light/75">
            Ainda não tem passaporte no evento?{' '}
            <Link to="/cadastro" className="text-tutu-lime font-bold hover:underline">
              Criar cadastro gratuito
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  const { registerDemo, notify } = useAppStore();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      notify('Senhas divergentes', 'A confirmação de senha deve coincidir com a senha informada.', 'error');
      return;
    }
    if (!acceptedTerms) {
      notify('Termos obrigatórios', 'Confirme o aceite dos Termos de Uso e Política de Privacidade.', 'error');
      return;
    }

    await registerDemo({ name, email, acceptedTerms });
    navigate('/app/dashboard');
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="tutu-card p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-tutu-secondary/40 text-tutu-lime text-xs font-bold uppercase tracking-wider">
            Passaporte Brasil Global Summit 2026
          </span>
          <h1 className="font-display font-bold text-3xl text-tutu-light">Criar Cadastro</h1>
          <p className="text-xs text-tutu-light/75">
            Preencha os campos abaixo para iniciar sua jornada gamificada nos dias 24, 25 e 26 de novembro.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-tutu-light/80 mb-1.5">
              Nome Completo
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-tutu-light/50 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Marina Costa"
                className="input-tutu pl-10 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-tutu-light/80 mb-1.5">
              E-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-tutu-light/50 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com.br"
                className="input-tutu pl-10 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-tutu-light/80 mb-1.5">
                Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="input-tutu text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-tutu-light/80 mb-1.5">
                Confirmação de Senha
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                className="input-tutu text-sm"
              />
            </div>
          </div>

          <label className="flex items-start gap-3 p-3.5 rounded-xl bg-tutu-dark/60 border border-tutu-secondary/50 cursor-pointer text-xs text-tutu-light/85">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 accent-tutu-lime w-4 h-4 rounded"
            />
            <span>
              Li e concordo com os{' '}
              <Link to="/termos" className="text-tutu-lime underline">
                Termos de Uso
              </Link>{' '}
              e com a{' '}
              <Link to="/privacidade" className="text-tutu-lime underline">
                Política de Privacidade
              </Link>{' '}
              do Desafio Global Summit 2026.
            </span>
          </label>

          <button
            type="submit"
            className="w-full py-3.5 px-4 btn-tutu-lime text-sm flex items-center justify-center gap-2"
          >
            <span>Concluir Cadastro e Acessar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-xs text-center text-tutu-light/75">
          Já possui cadastro?{' '}
          <Link to="/login" className="text-tutu-lime font-bold hover:underline">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
};

export const PasswordRecoveryPage: React.FC = () => {
  const { notify } = useAppStore();
  const [email, setEmail] = useState('');
  const [sentMessage, setSentMessage] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await authService.requestPasswordResetDemo(email);
    setSentMessage(res.message);
    notify('Recuperação Solicitada', res.message, 'info');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="tutu-card p-6 sm:p-8 space-y-6">
        <div className="w-12 h-12 rounded-2xl bg-tutu-blue/30 border border-tutu-blue flex items-center justify-center text-tutu-lime">
          <KeyRound className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-display font-bold text-2xl text-tutu-light">Recuperar Senha</h1>
          <p className="text-xs text-tutu-light/75">
            Informe seu e-mail cadastrado para receber o link demonstrativo de redefinição.
          </p>
        </div>

        {sentMessage ? (
          <div className="p-4 rounded-xl bg-tutu-secondary/30 border border-tutu-lime space-y-3">
            <div className="flex items-center gap-2 text-tutu-lime font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Solicitação Processada</span>
            </div>
            <p className="text-xs text-tutu-light/90">{sentMessage}</p>
            <Link to="/login" className="inline-block text-xs font-bold text-tutu-lime underline">
              Voltar para o Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-tutu-light/80 mb-1.5">
                E-mail Cadastrado
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.br"
                className="input-tutu text-sm"
              />
            </div>
            <button type="submit" className="w-full py-3 px-4 btn-tutu-primary text-sm">
              Enviar Instruções Demonstrativas
            </button>
          </form>
        )}

        <div className="text-center">
          <Link to="/login" className="text-xs text-tutu-light/75 hover:text-tutu-lime">
            ← Voltar para a tela de login
          </Link>
        </div>
      </div>
    </div>
  );
};

export const TermsOfUsePage: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 py-12">
    <div className="tutu-card p-6 sm:p-10 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-7 h-7 text-tutu-lime" />
        <h1 className="font-display font-bold text-3xl text-tutu-light">
          Termos de Uso — Desafio Global Summit 2026
        </h1>
      </div>
      <div className="space-y-4 text-sm text-tutu-light/85 leading-relaxed">
        <p>
          <strong>1. Objeto da Plataforma:</strong> O Desafio Global Summit 2026 é uma aplicação web gamificada voltada ao engajamento de visitantes durante os dias 24, 25 e 26 de novembro de 2026, na Arena BRB Mané Garrincha, em Brasília/DF.
        </p>
        <p>
          <strong>2. Participação e Pontuação:</strong> Os pontos acumulados decorrem exclusivamente da realização de missões presenciais e interativas junto às startups expositoras (Tutu, Escreve Lab, Futurize e Startup Convidada).
        </p>
        <p>
          <strong>3. Ausência de Sorteio Automático e Condição de Premiação:</strong> Esta plataforma não realiza sorteios automáticos ou jogos de azar. Eventuais reconhecimentos ou premiações dependem de autorização formal da organização e validação jurídica prévia.
        </p>
        <p>
          <strong>4. Conduta do Participante:</strong> É vedado o compartilhamento indevido de códigos de validação fora dos estandes oficiais, sujeito à revisão pela fila de moderação administrativa.
        </p>
      </div>
      <div className="pt-4">
        <Link to="/cadastro" className="px-5 py-2.5 rounded-xl btn-tutu-primary text-xs inline-block">
          Voltar para o Cadastro
        </Link>
      </div>
    </div>
  </div>
);

export const PrivacyPolicyPage: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 py-12">
    <div className="tutu-card p-6 sm:p-10 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-7 h-7 text-tutu-lime" />
        <h1 className="font-display font-bold text-3xl text-tutu-light">
          Política de Privacidade e Proteção de Dados
        </h1>
      </div>
      <div className="space-y-4 text-sm text-tutu-light/85 leading-relaxed">
        <p>
          <strong>1. Minimização de Dados no Ranking Público:</strong> Em conformidade com as boas práticas de privacidade, o Ranking Geral exibe exclusivamente a posição, o nome ou apelido configurado pelo usuário, a pontuação, medalhas e missões concluídas. E-mails, telefones ou documentos pessoais jamais são exibidos publicamente.
        </p>
        <p>
          <strong>2. Controle pelo Participante:</strong> Na tela de Perfil, o participante pode gerenciar a qualquer momento suas preferências de exibição de apelido, notificações de atividades e compartilhamento de interesses com as startups expositoras.
        </p>
        <p>
          <strong>3. Camada Demonstrativa:</strong> Nesta etapa do projeto front-end, os dados operam em memória através da camada de serviços independente, preparados para futura integração controlada com banco de dados SQLite.
        </p>
      </div>
      <div className="pt-4">
        <Link to="/cadastro" className="px-5 py-2.5 rounded-xl btn-tutu-primary text-xs inline-block">
          Voltar para o Cadastro
        </Link>
      </div>
    </div>
  </div>
);
