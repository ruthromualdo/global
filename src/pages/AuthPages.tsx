import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, KeyRound, Lock, Mail, Phone, ShieldCheck, User } from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import { authService } from '../services/authService';
import { maskBrazilianPhoneInput, validateBrazilianPhone } from '../utils/formatters';

export const LoginPage: React.FC = () => {
  const { loginDemo } = useAppStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await loginDemo(email, password);
    setLoading(false);
    if (res.ok) {
      navigate('/app/dashboard');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-3 sm:px-4 py-6 sm:py-12">
      <div className="tutu-card p-5 sm:p-8 space-y-6">
        <div className="space-y-2 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-tutu-secondary/40 text-tutu-lime text-xs font-bold uppercase tracking-wider">
            Passaporte do Participante
          </span>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-tutu-light">
            Entrar na Plataforma
          </h1>
          <p className="text-xs text-tutu-light/75 leading-relaxed">
            Acesse sua conta para acompanhar suas missões, pontos e posição no ranking.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold uppercase tracking-wider text-tutu-light/80 mb-1.5"
            >
              E-mail do Participante
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-tutu-light/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-tutu pl-10 text-sm"
                placeholder="seu.email@exemplo.br"
              />
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold uppercase tracking-wider text-tutu-light/80"
              >
                Senha
              </label>
              <Link to="/recuperar-senha" className="text-xs text-tutu-lime hover:underline py-0.5">
                Esqueceu a senha?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-tutu-light/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-tutu pl-10 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="min-h-[48px] w-full py-3.5 px-4 btn-tutu-lime text-sm flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Acessando...' : 'Entrar no Desafio Global'}</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </form>

        <div className="pt-4 border-t border-tutu-secondary/40 text-center space-y-3 text-xs">
          <p className="text-tutu-light/75">
            Ainda não tem passaporte no evento?{' '}
            <Link to="/cadastro" className="text-tutu-lime font-bold hover:underline inline-block py-1">
              Criar cadastro gratuito
            </Link>
          </p>

          <div className="pt-2 border-t border-tutu-secondary/25 flex justify-center">
            <Link
              to="/admin/login"
              className="inline-flex items-center gap-1.5 text-[11px] text-tutu-light/55 hover:text-tutu-light/90 transition-colors py-1.5 px-3 rounded-lg"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-tutu-secondary shrink-0" />
              <span>Acesso administrativo</span>
            </Link>
          </div>
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
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneValidation = validateBrazilianPhone(phone);
    if (!phoneValidation.valid) {
      notify(
        'Telefone inválido',
        phoneValidation.error || 'Informe um telefone ou WhatsApp brasileiro válido com DDD.',
        'error'
      );
      return;
    }
    if (password !== confirmPassword) {
      notify('Senhas divergentes', 'A confirmação de senha deve coincidir com a senha informada.', 'error');
      return;
    }
    if (!acceptedTerms) {
      notify('Termos obrigatórios', 'Confirme o aceite dos Termos de Uso e Política de Privacidade.', 'error');
      return;
    }

    const res = await registerDemo({
      name,
      email,
      phone: phoneValidation.normalized,
      password,
      acceptedTerms,
    });
    if (res.ok) {
      navigate('/app/dashboard');
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto px-3 sm:px-4 py-6 sm:py-10">
      <div className="tutu-card p-5 sm:p-8 space-y-6">
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-tutu-secondary/40 text-tutu-lime text-xs font-bold uppercase tracking-wider">
            Passaporte do Participante
          </span>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-tutu-light">
            Criar Cadastro
          </h1>
          <p className="text-xs text-tutu-light/75 leading-relaxed">
            Preencha os campos abaixo para iniciar sua jornada gamificada nos dias 24, 25 e 26 de novembro.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="register-name"
              className="block text-xs font-semibold uppercase tracking-wider text-tutu-light/80 mb-1.5"
            >
              Nome Completo
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-tutu-light/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="register-name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Marina Costa"
                className="input-tutu pl-10 text-sm"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="register-email"
              className="block text-xs font-semibold uppercase tracking-wider text-tutu-light/80 mb-1.5"
            >
              E-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-tutu-light/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="register-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com.br"
                className="input-tutu pl-10 text-sm"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="register-phone"
              className="block text-xs font-semibold uppercase tracking-wider text-tutu-light/80 mb-1.5"
            >
              Telefone / WhatsApp
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-tutu-light/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="register-phone"
                type="tel"
                required
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(maskBrazilianPhoneInput(e.target.value))}
                placeholder="(61) 99999-9999"
                className="input-tutu pl-10 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="register-password"
                className="block text-xs font-semibold uppercase tracking-wider text-tutu-light/80 mb-1.5"
              >
                Senha
              </label>
              <input
                id="register-password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="input-tutu text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="register-confirm-password"
                className="block text-xs font-semibold uppercase tracking-wider text-tutu-light/80 mb-1.5"
              >
                Confirmação de Senha
              </label>
              <input
                id="register-confirm-password"
                type="password"
                required
                autoComplete="new-password"
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
              className="mt-0.5 accent-tutu-lime w-4 h-4 rounded shrink-0"
            />
            <span className="leading-relaxed">
              Li e concordo com os{' '}
              <Link to="/termos" className="text-tutu-lime underline">
                Termos de Uso
              </Link>{' '}
              e com a{' '}
              <Link to="/privacidade" className="text-tutu-lime underline">
                Política de Privacidade
              </Link>{' '}
              do evento.
            </span>
          </label>

          <button
            type="submit"
            className="min-h-[48px] w-full py-3.5 px-4 btn-tutu-lime text-sm flex items-center justify-center gap-2"
          >
            <span>Concluir Cadastro e Acessar</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </form>

        <p className="text-xs text-center text-tutu-light/75">
          Já possui cadastro?{' '}
          <Link to="/login" className="text-tutu-lime font-bold hover:underline inline-block py-1">
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
    <div className="w-full max-w-md mx-auto px-3 sm:px-4 py-6 sm:py-12">
      <div className="tutu-card p-5 sm:p-8 space-y-6">
        <div className="w-12 h-12 rounded-2xl bg-tutu-blue/30 border border-tutu-blue flex items-center justify-center text-tutu-lime">
          <KeyRound className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-display font-bold text-2xl text-tutu-light">Recuperar Senha</h1>
          <p className="text-xs text-tutu-light/75 leading-relaxed">
            Informe seu e-mail cadastrado para receber o link de redefinição.
          </p>
        </div>

        {sentMessage ? (
          <div className="p-4 rounded-xl bg-tutu-secondary/30 border border-tutu-lime space-y-3">
            <div className="flex items-center gap-2 text-tutu-lime font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Solicitação Processada</span>
            </div>
            <p className="text-xs text-tutu-light/90 break-words">{sentMessage}</p>
            <Link to="/login" className="inline-block text-xs font-bold text-tutu-lime underline py-1">
              Voltar para o Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label
                htmlFor="recovery-email"
                className="block text-xs font-semibold uppercase tracking-wider text-tutu-light/80 mb-1.5"
              >
                E-mail Cadastrado
              </label>
              <input
                id="recovery-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.br"
                className="input-tutu text-sm"
              />
            </div>
            <button
              type="submit"
              className="min-h-[48px] w-full py-3 px-4 btn-tutu-primary text-sm"
            >
              Enviar Instruções
            </button>
          </form>
        )}

        <div className="text-center">
          <Link to="/login" className="text-xs text-tutu-light/75 hover:text-tutu-lime inline-block py-1">
            ← Voltar para a tela de login
          </Link>
        </div>
      </div>
    </div>
  );
};

export const TermsOfUsePage: React.FC = () => (
  <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
    <div className="tutu-card p-5 sm:p-10 space-y-6">
      <div className="flex items-start sm:items-center gap-3">
        <ShieldCheck className="w-7 h-7 text-tutu-lime shrink-0 mt-1 sm:mt-0" />
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-tutu-light">
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
        <Link
          to="/cadastro"
          className="min-h-[44px] px-5 py-2.5 rounded-xl btn-tutu-primary text-xs inline-flex items-center justify-center"
        >
          Voltar para o Cadastro
        </Link>
      </div>
    </div>
  </div>
);

export const PrivacyPolicyPage: React.FC = () => (
  <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
    <div className="tutu-card p-5 sm:p-10 space-y-6">
      <div className="flex items-start sm:items-center gap-3">
        <ShieldCheck className="w-7 h-7 text-tutu-lime shrink-0 mt-1 sm:mt-0" />
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-tutu-light">
          Política de Privacidade e Proteção de Dados
        </h1>
      </div>
      <div className="space-y-4 text-sm text-tutu-light/85 leading-relaxed">
        <p>
          <strong>1. Minimização de Dados no Ranking Público:</strong> Em conformidade com as boas práticas de privacidade, o Ranking Geral exibe exclusivamente a posição, o nome ou apelido configurado pelo usuário, a pontuação e missões concluídas. E-mails, telefones ou documentos pessoais jamais são exibidos publicamente.
        </p>
        <p>
          <strong>2. Controle pelo Participante:</strong> Na tela de Perfil, o participante pode gerenciar a qualquer momento suas preferências de exibição de apelido, notificações de atividades e compartilhamento de interesses com as startups expositoras.
        </p>
        <p>
          <strong>3. Persistência e Segurança:</strong> Os dados são armazenados de forma segura no banco SQLite com controle de acesso baseado em papéis (RBAC) e senhas protegidas por hash criptográfico.
        </p>
        <p>
          <strong>4. Evidências de Missões (Validação Interna — LGPD, Art. 7º, V):</strong> Fotos ou documentos enviados para comprovação de missões obrigatórias são armazenados em diretório privado, acessíveis exclusivamente pelo próprio participante e pela equipe administrativa para fins estritos de validação de participação e pontuação, sem publicação automática.
        </p>
        <p>
          <strong>5. Autorização Opcional de Divulgação Pública de Imagem (LGPD, Art. 7º, I):</strong> Qualquer utilização promocional ou institucional de imagens depende de autorização específica, opcional e inequívoca registrada pelo participante na tela de Perfil, podendo ser revogada a qualquer momento sem prejuízo à participação, ao envio de evidências ou à pontuação no evento.
        </p>
        <p>
          <strong>6. Retenção e Exclusão Pós-Evento:</strong> Os registros de pontuação e validações são mantidos pelo prazo estritamente necessário à auditoria, prestação de contas e premiação do evento, sendo eliminados ou anonimizados após o encerramento do prazo operacional e legal aplicável.
        </p>
      </div>
      <div className="pt-4">
        <Link
          to="/cadastro"
          className="min-h-[44px] px-5 py-2.5 rounded-xl btn-tutu-primary text-xs inline-flex items-center justify-center"
        >
          Voltar para o Cadastro
        </Link>
      </div>
    </div>
  </div>
);
