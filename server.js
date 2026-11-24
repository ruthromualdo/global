// server/env.ts
import fs from "node:fs";
import path from "node:path";
function loadEnvFileIfExists(envPath = path.resolve(process.cwd(), ".env")) {
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    if (!key || process.env[key] !== void 0) continue;
    let value = line.slice(eqIndex + 1).trim();
    if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
loadEnvFileIfExists();

// server/index.ts
import express from "express";
import cors from "cors";
import fs4 from "node:fs";
import path4 from "node:path";

// src/utils/formatters.ts
var VALID_BRAZILIAN_DDDS = /* @__PURE__ */ new Set([
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "21",
  "22",
  "24",
  "27",
  "28",
  "31",
  "32",
  "33",
  "34",
  "35",
  "37",
  "38",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
  "47",
  "48",
  "49",
  "51",
  "53",
  "54",
  "55",
  "61",
  "62",
  "63",
  "64",
  "65",
  "66",
  "67",
  "68",
  "69",
  "71",
  "73",
  "74",
  "75",
  "77",
  "79",
  "81",
  "82",
  "83",
  "84",
  "85",
  "86",
  "87",
  "88",
  "89",
  "91",
  "92",
  "93",
  "94",
  "95",
  "96",
  "97",
  "98",
  "99"
]);

// server/db/database.ts
import Database from "better-sqlite3";
import fs3 from "node:fs";
import path3 from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";

// src/mocks/mockData.ts
var initialEventSettings = {
  eventName: "Desafio Global Summit 2026",
  editionYear: 2026,
  dates: "24, 25 e 26 de novembro de 2026",
  location: "Arena BRB Man\xE9 Garrincha",
  city: "Bras\xEDlia \u2014 DF",
  description: "Plataforma web gamificada oficial para engajar os visitantes do Brasil Global Summit 2026, conectando participantes \xE0s solu\xE7\xF5es inovadoras das startups expositoras.",
  activePeriod: "24/11/2026 09:00 at\xE9 26/11/2026 20:00 (Hor\xE1rio de Bras\xEDlia)",
  scoringRules: [
    "Visita\xE7\xE3o presencial com leitura de QR Code no estande: 150 a 250 pontos.",
    "Experimenta\xE7\xE3o guiada da solu\xE7\xE3o da startup: 300 a 450 pontos.",
    "Conclus\xE3o de Quiz tem\xE1tico com acerto m\xEDnimo de 70%: 200 a 300 pontos.",
    "Compartilhamento validado pela equipe da arena: 150 pontos.",
    "Miss\xE3o surpresa rel\xE2mpago durante pain\xE9is principais: 500 pontos."
  ],
  tieBreakerCriteria: [
    "1\xBA Crit\xE9rio: Maior n\xFAmero de startups distintas visitadas na Arena BRB.",
    "2\xBA Crit\xE9rio: Maior quantidade de miss\xF5es de Experimenta\xE7\xE3o conclu\xEDdas.",
    "3\xBA Crit\xE9rio: Menor tempo total entre o cadastro e a conquista da pontua\xE7\xE3o atual."
  ],
  rewardsEnabled: false,
  rewardsLegalNote: "M\xF3dulo de premia\xE7\xE3o desabilitado por padr\xE3o. A ativa\xE7\xE3o aguarda autoriza\xE7\xE3o formal da comiss\xE3o organizadora do Brasil Global Summit 2026 e parecer de valida\xE7\xE3o jur\xEDdica. Nenhum sorteio autom\xE1tico \xE9 realizado pela plataforma.",
  rewardsDescription: "Reconhecimento oficial por m\xE9rito de engajamento no palco de inova\xE7\xE3o (sujeito \xE0 libera\xE7\xE3o institucional).",
  defaultMissionTimerMinutes: 5
};
var initialStartups = [
  {
    id: "st-tutu",
    name: "Tutu (Ex Devedor)",
    shortName: "Tutu",
    tagline: "Do aperto financeiro \xE0 paz de esp\xEDrito com taxa zero de complica\xE7\xE3o.",
    description: "Plataforma inteligente de sa\xFAde financeira, renegocia\xE7\xE3o justa e educa\xE7\xE3o pr\xE1tica que transforma a rela\xE7\xE3o dos brasileiros com o pr\xF3prio dinheiro e devolve o poder de planejar o futuro.",
    category: "Fintech & Bem-Estar Financeiro",
    solutionPresentation: "Diagn\xF3stico instant\xE2neo de perfil financeiro, simulador de quita\xE7\xE3o inteligente com intelig\xEAncia artificial e trilhas gamificadas de reorganiza\xE7\xE3o de or\xE7amento.",
    boothNumber: "Pavilh\xE3o Inova\xE7\xE3o \u2014 Estande A01",
    logoText: "TUTU",
    availablePoints: 1200,
    active: true,
    website: "https://tutu.exemplo.br"
  },
  {
    id: "st-escrevelab",
    name: "Escreve Lab",
    shortName: "Escreve Lab",
    tagline: "Comunica\xE7\xE3o estrat\xE9gica, escrita criativa e IA autoral para neg\xF3cios.",
    description: "Laborat\xF3rio de tecnologia e linguagem que potencializa fundadores, equipes e criadores a estruturarem narrativas claras, pitches memor\xE1veis e documenta\xE7\xE3o viva de alto impacto.",
    category: "EdTech & Produtividade Criativa",
    solutionPresentation: "Est\xFAdio interativo de co-cria\xE7\xE3o textual com assistentes calibrados para storytelling executivo, estrutura\xE7\xE3o de propostas comerciais e clareza de marca.",
    boothNumber: "Pavilh\xE3o Inova\xE7\xE3o \u2014 Estande B04",
    logoText: "ESCREVE",
    availablePoints: 950,
    active: true,
    website: "https://escrevelab.exemplo.br"
  },
  {
    id: "st-futurize",
    name: "Futurize",
    shortName: "Futurize",
    tagline: "Cen\xE1rios futuros, tend\xEAncias emergentes e inova\xE7\xE3o aplicada hoje.",
    description: "Hub de intelig\xEAncia prospectiva e transforma\xE7\xE3o digital que auxilia empresas e lideran\xE7as a mapearem tecnologias emergentes e desenharem produtos prontos para a pr\xF3xima d\xE9cada.",
    category: "DeepTech & Estrat\xE9gia de Futuro",
    solutionPresentation: "Radar interativo de tend\xEAncias 2026-2035 e simulador de maturidade de inova\xE7\xE3o para tomada de decis\xE3o \xE1gil no ecossistema empreendedor.",
    boothNumber: "Pavilh\xE3o Inova\xE7\xE3o \u2014 Estande C02",
    logoText: "FUTURIZE",
    availablePoints: 1e3,
    active: true,
    website: "https://futurize.exemplo.br"
  },
  {
    id: "st-convidada",
    name: "Startup Convidada (Espa\xE7o Configur\xE1vel)",
    shortName: "Startup Convidada",
    tagline: "Vaga reservada para startup convidada do ecossistema Brasil Global Summit.",
    description: "Posi\xE7\xE3o pr\xE9-estruturada na plataforma para r\xE1pida ativa\xE7\xE3o e personaliza\xE7\xE3o pelo painel administrativo assim que a startup convidada for homologada pela curadoria do evento.",
    category: "Ecossistema Convidado (Configur\xE1vel)",
    solutionPresentation: "Espa\xE7o demonstrativo pronto para receber logotipo, proposta de valor, QR Codes e miss\xF5es exclusivas sem necessidade de altera\xE7\xE3o de c\xF3digo.",
    boothNumber: "Pavilh\xE3o Inova\xE7\xE3o \u2014 Estande D01",
    logoText: "GUEST",
    availablePoints: 800,
    active: true,
    isConfigurableGuest: true,
    website: "https://summit2026.exemplo.br"
  }
];
var initialMissions = [
  {
    id: "ms-01",
    title: "Check-in no Estande Tutu (Ex Devedor)",
    description: "Visite o estande da Tutu na Arena BRB Man\xE9 Garrincha, conhe\xE7a a equipe e escaneie o QR Code oficial do totem de boas-vindas.",
    startupId: "st-tutu",
    startupName: "Tutu (Ex Devedor)",
    category: "Visita\xE7\xE3o",
    points: 200,
    estimatedTime: "3 min",
    status: "Dispon\xEDvel",
    period: "24 a 26/11/2026",
    completionCriteria: "Leitura validada do QR Code TUTU-CHECKIN-2026.",
    active: true,
    qrCodeRequired: "TUTU-2026"
  },
  {
    id: "ms-02",
    title: "Simulador Paz de Esp\xEDrito Tutu",
    description: "Experimente o diagn\xF3stico interativo da Tutu no tablet do estande e descubra seu \xEDndice de liberdade financeira em menos de 5 minutos.",
    startupId: "st-tutu",
    startupName: "Tutu (Ex Devedor)",
    category: "Experimenta\xE7\xE3o",
    points: 400,
    estimatedTime: "5 min",
    status: "Dispon\xEDvel",
    period: "24 a 26/11/2026",
    completionCriteria: "Finalizar a simula\xE7\xE3o guiada e validar o c\xF3digo de conclus\xE3o.",
    active: true,
    qrCodeRequired: "TUTU-SIMULADOR"
  },
  {
    id: "ms-03",
    title: "Quiz: Mitos e Verdades da Taxa Zero",
    description: "Responda 3 perguntas r\xE1pidas sobre educa\xE7\xE3o financeira, renegocia\xE7\xE3o consciente e planejamento para desbloquear pontos imediatos.",
    startupId: "st-tutu",
    startupName: "Tutu (Ex Devedor)",
    category: "Quiz",
    points: 250,
    estimatedTime: "4 min",
    status: "Dispon\xEDvel",
    period: "24 a 26/11/2026",
    completionCriteria: "Acertar pelo menos 2 das 3 quest\xF5es do Quiz Tutu.",
    active: true,
    quizQuestions: [
      {
        question: "Qual \xE9 o primeiro passo recomendado pela metodologia Tutu para sair das d\xEDvidas com paz de esp\xEDrito?",
        options: [
          "Assumir novos empr\xE9stimos sem mapear o or\xE7amento",
          "Mapear a real situa\xE7\xE3o financeira com clareza e priorizar negocia\xE7\xF5es justas",
          "Ignorar as notifica\xE7\xF5es por 6 meses"
        ],
        correctIndex: 1
      },
      {
        question: 'O que representa a cor "Verdinho do Tutu" (#D0FF00) na jornada do participante?',
        options: [
          "Progresso, conquistas desbloqueadas e metas alcan\xE7adas",
          "Apenas avisos de erro do sistema",
          "Bloqueio tempor\xE1rio de conta"
        ],
        correctIndex: 0
      },
      {
        question: "Qual benef\xEDcio a educa\xE7\xE3o financeira cont\xEDnua traz para empreendedores e visitantes do Summit?",
        options: [
          "Reduz a capacidade de investimento",
          "Aumenta a previsibilidade de caixa e a tomada de decis\xE3o consciente",
          "Elimina a necessidade de planejamento estrat\xE9gico"
        ],
        correctIndex: 1
      }
    ]
  },
  {
    id: "ms-04",
    title: "Laborat\xF3rio de Pitch em 60 Segundos",
    description: "Passe pelo estande da Escreve Lab e teste a ferramenta de estrutura\xE7\xE3o de narrativa para criar seu pitch de impacto.",
    startupId: "st-escrevelab",
    startupName: "Escreve Lab",
    category: "Experimenta\xE7\xE3o",
    points: 350,
    estimatedTime: "6 min",
    status: "Dispon\xEDvel",
    period: "24 a 26/11/2026",
    completionCriteria: "Gerar um card de pitch no terminal Escreve Lab.",
    active: true,
    qrCodeRequired: "ESCREVE-PITCH"
  },
  {
    id: "ms-05",
    title: "Quiz: Clareza e Escrita Estrat\xE9gica",
    description: "Teste seus conhecimentos sobre storytelling para neg\xF3cios e comunica\xE7\xE3o objetiva com a curadoria da Escreve Lab.",
    startupId: "st-escrevelab",
    startupName: "Escreve Lab",
    category: "Quiz",
    points: 200,
    estimatedTime: "3 min",
    status: "Dispon\xEDvel",
    period: "24 a 26/11/2026",
    completionCriteria: "Responder ao quiz interativo da Escreve Lab.",
    active: true,
    quizQuestions: [
      {
        question: "Em um pitch de alto impacto, qual elemento deve aparecer nos primeiros 15 segundos?",
        options: [
          "O problema real que sua solu\xE7\xE3o resolve de forma clara",
          "A lista completa de todos os fornecedores secund\xE1rios",
          "O hist\xF3rico escolar detalhado de cada s\xF3cio"
        ],
        correctIndex: 0
      },
      {
        question: "Qual \xE9 o principal objetivo do m\xE9todo Escreve Lab?",
        options: [
          "Substituir completamente a voz humana por textos gen\xE9ricos",
          "Unir clareza estrat\xE9gica, autenticidade e ferramentas inteligentes de escrita",
          "Aumentar o tamanho dos relat\xF3rios corporativos"
        ],
        correctIndex: 1
      }
    ]
  },
  {
    id: "ms-06",
    title: "Radar de Horizontes 2030 \u2014 Futurize",
    description: "Escaneie o QR Code no painel imersivo da Futurize e explore as tend\xEAncias que est\xE3o moldando a pr\xF3xima d\xE9cada.",
    startupId: "st-futurize",
    startupName: "Futurize",
    category: "Visita\xE7\xE3o",
    points: 250,
    estimatedTime: "4 min",
    status: "Dispon\xEDvel",
    period: "24 a 26/11/2026",
    completionCriteria: "Escanear o c\xF3digo FUTURIZE-2030 no estande C02.",
    active: true,
    qrCodeRequired: "FUTURIZE-2030"
  },
  {
    id: "ms-07",
    title: "Insight Compartilhado na Arena BRB",
    description: "Registre seu principal aprendizado com as startups do Summit e envie o c\xF3digo de valida\xE7\xE3o para a curadoria.",
    startupId: "st-futurize",
    startupName: "Futurize",
    category: "Compartilhamento",
    points: 200,
    estimatedTime: "5 min",
    status: "Dispon\xEDvel",
    period: "24 a 26/11/2026",
    completionCriteria: "Valida\xE7\xE3o pela equipe de modera\xE7\xE3o no painel administrativo.",
    active: true
  },
  {
    id: "ms-08",
    title: "Desafio Secreto: Conex\xE3o Ecossistema",
    description: "Miss\xE3o especial desbloqueada ap\xF3s visitar as 3 startups \xE2ncoras e o espa\xE7o da Startup Convidada.",
    startupId: "st-convidada",
    startupName: "Startup Convidada (Espa\xE7o Configur\xE1vel)",
    category: "Miss\xE3o surpresa",
    points: 500,
    estimatedTime: "8 min",
    status: "Bloqueada",
    period: "26/11/2026 (Dia Final)",
    completionCriteria: "Concluir ao menos 4 miss\xF5es anteriores nas startups expositoras.",
    active: true,
    qrCodeRequired: "SUMMIT-SURPRESA"
  }
];
var initialQRCodes = [
  {
    id: "qr-01",
    code: "TUTU-2026",
    label: "Totem Principal \u2014 Estande Tutu",
    startupId: "st-tutu",
    startupName: "Tutu (Ex Devedor)",
    missionId: "ms-01",
    missionTitle: "Check-in no Estande Tutu (Ex Devedor)",
    points: 200,
    scansCount: 0,
    active: true,
    createdAt: "20/11/2026"
  },
  {
    id: "qr-02",
    code: "TUTU-SIMULADOR",
    label: "Bancada de Experimenta\xE7\xE3o \u2014 Simulador Tutu",
    startupId: "st-tutu",
    startupName: "Tutu (Ex Devedor)",
    missionId: "ms-02",
    missionTitle: "Simulador Paz de Esp\xEDrito Tutu",
    points: 400,
    scansCount: 0,
    active: true,
    createdAt: "20/11/2026"
  },
  {
    id: "qr-03",
    code: "ESCREVE-PITCH",
    label: "Esta\xE7\xE3o de Pitch \u2014 Escreve Lab",
    startupId: "st-escrevelab",
    startupName: "Escreve Lab",
    missionId: "ms-04",
    missionTitle: "Laborat\xF3rio de Pitch em 60 Segundos",
    points: 350,
    scansCount: 0,
    active: true,
    createdAt: "20/11/2026"
  },
  {
    id: "qr-04",
    code: "FUTURIZE-2030",
    label: "Painel Imersivo \u2014 Radar Futurize",
    startupId: "st-futurize",
    startupName: "Futurize",
    missionId: "ms-06",
    missionTitle: "Radar de Horizontes 2030 \u2014 Futurize",
    points: 250,
    scansCount: 0,
    active: true,
    createdAt: "20/11/2026"
  },
  {
    id: "qr-05",
    code: "SUMMIT-SURPRESA",
    label: "Totem Especial \u2014 Startup Convidada",
    startupId: "st-convidada",
    startupName: "Startup Convidada (Espa\xE7o Configur\xE1vel)",
    missionId: "ms-08",
    missionTitle: "Desafio Secreto: Conex\xE3o Ecossistema",
    points: 500,
    scansCount: 0,
    active: true,
    createdAt: "21/11/2026"
  }
];
var initialGovernancePlans = Array.from({ length: 12 }, (_, idx) => {
  const num = String(idx + 1).padStart(2, "0");
  return {
    id: `gov-plan-${num}`,
    code: `Plano ${num}`,
    name: `Plano ${num}`,
    objective: "Campo reservado \u2014 aguardando preenchimento conforme documento oficial de governan\xE7a.",
    description: "Estrutura visual preparada para inser\xE7\xE3o da descri\xE7\xE3o oficial do plano de governan\xE7a.",
    responsible: "A definir pela governan\xE7a do projeto",
    indicators: "Indicadores a serem vinculados via documento oficial",
    status: "Aguardando preenchimento oficial",
    relatedDocuments: [`Documento Oficial \u2014 Plano ${num} (Pendente de anexa\xE7\xE3o)`]
  };
});

// server/security/auth.ts
import crypto2 from "node:crypto";
var SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS) || 8 * 60 * 60 * 1e3;
function hashPassword(plainPassword) {
  const salt = crypto2.randomBytes(16).toString("hex");
  const derivedKey = crypto2.scryptSync(plainPassword, salt, 64).toString("hex");
  return `scrypt$${salt}$${derivedKey}`;
}
function verifyPassword(plainPassword, storedHash) {
  if (!storedHash || !storedHash.startsWith("scrypt$")) {
    return false;
  }
  const parts = storedHash.split("$");
  if (parts.length !== 3) return false;
  const [, salt, keyHex] = parts;
  const keyBuffer = Buffer.from(keyHex, "hex");
  const derivedBuffer = crypto2.scryptSync(plainPassword, salt, 64);
  if (keyBuffer.length !== derivedBuffer.length) return false;
  return crypto2.timingSafeEqual(keyBuffer, derivedBuffer);
}
function hashSessionToken(rawToken) {
  return crypto2.createHash("sha256").update(rawToken).digest("hex");
}
function createSessionInDb(params) {
  const rawToken = crypto2.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(rawToken);
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  db.prepare("DELETE FROM auth_sessions WHERE expires_at <= ?").run(now);
  db.prepare(`
    INSERT INTO auth_sessions (token_hash, user_id, user_email, role, created_at, expires_at, revoked)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `).run(tokenHash, params.userId, params.email, params.role, now, expiresAt);
  return { token: rawToken, expiresAt };
}
function revokeSessionTokenInDb(rawToken) {
  const tokenHash = hashSessionToken(rawToken);
  const result = db.prepare("UPDATE auth_sessions SET revoked = 1 WHERE token_hash = ?").run(tokenHash);
  return Number(result.changes) > 0;
}
function extractBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}
function resolveSessionFromRequest(req) {
  const rawToken = extractBearerToken(req);
  if (!rawToken) return null;
  const tokenHash = hashSessionToken(rawToken);
  const now = Date.now();
  const row = db.prepare(`
      SELECT
        s.token_hash,
        s.user_id,
        s.expires_at,
        s.revoked,
        p.email,
        p.name,
        p.role,
        p.status
      FROM auth_sessions s
      INNER JOIN participants p ON p.id = s.user_id
      WHERE s.token_hash = ?
      LIMIT 1
    `).get(tokenHash);
  if (!row) return null;
  if (Boolean(row.revoked)) return null;
  if (Number(row.expires_at) <= now) {
    db.prepare("UPDATE auth_sessions SET revoked = 1 WHERE token_hash = ?").run(tokenHash);
    return null;
  }
  if (String(row.status) === "Inativo") return null;
  const normalizedRole = String(row.role).toUpperCase() === "ADMIN" ? "ADMIN" : "PARTICIPANT";
  return {
    tokenHash: String(row.token_hash),
    userId: String(row.user_id),
    email: String(row.email),
    name: String(row.name),
    role: normalizedRole,
    expiresAt: Number(row.expires_at)
  };
}
function requireAuth(req, res, next) {
  const session = resolveSessionFromRequest(req);
  if (!session) {
    res.status(401).json({
      error: "N\xE3o autenticado. Fa\xE7a login para acessar este recurso.",
      code: "AUTH_REQUIRED"
    });
    return;
  }
  req.authSession = session;
  next();
}
function requireParticipant(req, res, next) {
  const session = resolveSessionFromRequest(req);
  if (!session) {
    res.status(401).json({
      error: "N\xE3o autenticado. Fa\xE7a login como participante para acessar este recurso.",
      code: "AUTH_REQUIRED"
    });
    return;
  }
  if (session.role !== "PARTICIPANT") {
    res.status(403).json({
      error: "Acesso negado (HTTP 403): opera\xE7\xE3o exclusiva de participantes autenticados.",
      code: "PARTICIPANT_ROLE_REQUIRED"
    });
    return;
  }
  req.authSession = session;
  next();
}
function requireAdmin(req, res, next) {
  const session = resolveSessionFromRequest(req);
  if (!session) {
    res.status(401).json({
      error: "Acesso restrito. Autentica\xE7\xE3o administrativa obrigat\xF3ria.",
      code: "ADMIN_AUTH_REQUIRED"
    });
    return;
  }
  if (session.role !== "ADMIN") {
    res.status(403).json({
      error: "Acesso negado (HTTP 403): sua conta possui perfil PARTICIPANT e n\xE3o tem permiss\xE3o para executar opera\xE7\xF5es administrativas.",
      code: "FORBIDDEN_ADMIN_ONLY"
    });
    return;
  }
  req.authSession = session;
  next();
}

// server/db/circuitScoring.ts
var TOTAL_CIRCUIT_POINTS = 1e3;
var TOTAL_UNLOCK_POINTS = 80;
var TOTAL_COMPLETION_POINTS = 720;
var TOTAL_SPEED_BONUS_POINTS = 200;
function allocateByRelativeWeights(total, weights) {
  if (!Number.isInteger(total) || total < 0) {
    throw new Error(`Total inv\xE1lido para parti\xE7\xE3o ponderada: ${total}`);
  }
  if (!Array.isArray(weights) || weights.length === 0) {
    throw new Error("A lista de pesos relativos deve conter pelo menos 1 item.");
  }
  const normalizedWeights = weights.map((w) => {
    const num = Number(w);
    return Number.isFinite(num) && num > 0 ? num : 1;
  });
  const totalWeight = normalizedWeights.reduce((acc, w) => acc + w, 0);
  const exact = normalizedWeights.map((w) => total * w / totalWeight);
  const floors = exact.map((val) => Math.floor(val));
  let remainder = total - floors.reduce((acc, f) => acc + f, 0);
  const rankedIndices = exact.map((val, idx) => ({ idx, frac: val - floors[idx] })).sort((a, b) => {
    const diff = b.frac - a.frac;
    if (Math.abs(diff) > 1e-12) return diff;
    return a.idx - b.idx;
  });
  const result = [...floors];
  for (let k = 0; k < remainder; k++) {
    result[rankedIndices[k].idx] += 1;
  }
  return result;
}
function distributeWeightedCircuitPoints(weights) {
  if (!Array.isArray(weights) || weights.length < 1) {
    throw new Error("A quantidade de miss\xF5es deve ser um n\xFAmero inteiro maior ou igual a 1.");
  }
  const unlockAlloc = allocateByRelativeWeights(TOTAL_UNLOCK_POINTS, weights);
  const completionAlloc = allocateByRelativeWeights(TOTAL_COMPLETION_POINTS, weights);
  const speedBonusAlloc = allocateByRelativeWeights(TOTAL_SPEED_BONUS_POINTS, weights);
  const result = [];
  for (let i = 0; i < weights.length; i++) {
    const unlockPoints = unlockAlloc[i];
    const completionPoints = completionAlloc[i];
    const maxSpeedBonus = speedBonusAlloc[i];
    const points = completionPoints;
    const totalPotentialPoints = unlockPoints + completionPoints + maxSpeedBonus;
    result.push({
      sequenceOrder: i + 1,
      unlockPoints,
      completionPoints,
      maxSpeedBonus,
      points,
      totalPotentialPoints
    });
  }
  return result;
}
function getOfficialCircuitActivityCountInDb(database) {
  const query = `
    SELECT (
      (SELECT COUNT(*)
       FROM participant_missions pm
       INNER JOIN missions m ON pm.mission_id = m.id
       WHERE m.sequence_order IS NOT NULL
         AND (
           pm.status IN ('Em andamento', 'Aguardando valida\xE7\xE3o', 'Conclu\xEDda')
           OR pm.started_at_ms IS NOT NULL
           OR pm.completed_at_ms IS NOT NULL
         )
      ) +
      (SELECT COUNT(*)
       FROM mission_completions mc
       INNER JOIN missions m ON mc.mission_id = m.id
       WHERE m.sequence_order IS NOT NULL
      ) +
      (SELECT COUNT(*)
       FROM points_transactions pt
       INNER JOIN missions m ON pt.mission_id = m.id
       WHERE m.sequence_order IS NOT NULL
      ) +
      (SELECT COUNT(*)
       FROM qr_scans qs
       INNER JOIN qr_codes q ON qs.qr_code_id = q.id
       INNER JOIN missions m ON q.mission_id = m.id
       WHERE m.sequence_order IS NOT NULL
      )
    ) AS total_activity
  `;
  const row = database.prepare(query).get();
  return Number(row?.total_activity || 0);
}
function hasOfficialCircuitStartedInDb(database) {
  return getOfficialCircuitActivityCountInDb(database) > 0;
}
function compactCircuitSequencesInDb(database) {
  database.prepare("UPDATE missions SET sequence_order = NULL WHERE active = 0 AND sequence_order IS NOT NULL").run();
  const activeOfficial = database.prepare(`
      SELECT id, sequence_order, COALESCE(track_id, 'default') AS track_key
      FROM missions
      WHERE active = 1 AND sequence_order IS NOT NULL
      ORDER BY track_key ASC, sequence_order ASC, rowid ASC
    `).all();
  if (activeOfficial.length === 0) {
    return;
  }
  const byTrack = /* @__PURE__ */ new Map();
  for (const row of activeOfficial) {
    const list = byTrack.get(row.track_key) || [];
    list.push({ id: row.id, sequence_order: row.sequence_order });
    byTrack.set(row.track_key, list);
  }
  const updateTemp = database.prepare("UPDATE missions SET sequence_order = ? WHERE id = ?");
  for (const [, list] of byTrack.entries()) {
    for (let i = 0; i < list.length; i++) {
      updateTemp.run(-(i + 1), list[i].id);
    }
  }
  database.prepare("UPDATE missions SET sequence_order = -sequence_order WHERE sequence_order < 0").run();
}
function recalculateCircuitMissionPointsInDb(database) {
  const candidateRows = database.prepare(`
      SELECT id, title, sequence_order, COALESCE(track_id, 'default') AS track_key,
             COALESCE(relative_weight, 10) AS relative_weight,
             active, points, unlock_points, completion_points, max_speed_bonus
      FROM missions
      WHERE active = 1 AND sequence_order IS NOT NULL
      ORDER BY track_key ASC, sequence_order ASC, rowid ASC
    `).all();
  if (candidateRows.length === 0) {
    throw new Error(
      "Nenhuma miss\xE3o oficial ativa encontrada no circuito para redistribui\xE7\xE3o de pontua\xE7\xE3o."
    );
  }
  const n = candidateRows.length;
  const byTrack = /* @__PURE__ */ new Map();
  for (const row of candidateRows) {
    const trackKey = String(row.track_key || "default");
    const list = byTrack.get(trackKey) || [];
    list.push(row);
    byTrack.set(trackKey, list);
  }
  for (const [trackKey, trackRows] of byTrack.entries()) {
    const seenOrders = /* @__PURE__ */ new Set();
    for (const row of trackRows) {
      const seq = Number(row.sequence_order);
      if (!Number.isInteger(seq) || seq < 1) {
        throw new Error(
          `Ordem sequencial inv\xE1lida detectada na miss\xE3o "${row.title}" (ID: ${row.id}, trilha: ${trackKey}): ${row.sequence_order}. Deve ser um n\xFAmero inteiro positivo.`
        );
      }
      if (seenOrders.has(seq)) {
        throw new Error(
          `Ordem sequencial duplicada detectada na trilha "${trackKey}": posi\xE7\xE3o ${seq} utilizada por mais de uma miss\xE3o.`
        );
      }
      seenOrders.add(seq);
    }
    for (let i = 0; i < trackRows.length; i++) {
      const row = trackRows[i];
      const seq = Number(row.sequence_order);
      const expected = i + 1;
      if (seq !== expected) {
        throw new Error(
          `A sequ\xEAncia da trilha "${trackKey}" n\xE3o \xE9 cont\xEDgua a partir de 1: esperava posi\xE7\xE3o ${expected}, mas encontrou posi\xE7\xE3o ${seq} na miss\xE3o "${row.title}" (ID: ${row.id}).`
        );
      }
    }
  }
  const weights = candidateRows.map((row) => {
    const w = Number(row.relative_weight);
    return Number.isFinite(w) && w > 0 ? w : 10;
  });
  const distributions = distributeWeightedCircuitPoints(weights);
  const savepointName = `sp_circuit_recalc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  database.exec(`SAVEPOINT ${savepointName};`);
  try {
    const updateStmt = database.prepare(`
      UPDATE missions
      SET unlock_points = ?,
          completion_points = ?,
          max_speed_bonus = ?,
          points = ?
      WHERE id = ?
    `);
    const updatedMissions = [];
    for (let i = 0; i < n; i++) {
      const row = candidateRows[i];
      const dist = distributions[i];
      updateStmt.run(
        dist.unlockPoints,
        dist.completionPoints,
        dist.maxSpeedBonus,
        dist.points,
        row.id
      );
      updatedMissions.push({
        id: String(row.id),
        title: String(row.title),
        sequenceOrder: Number(row.sequence_order),
        unlockPoints: dist.unlockPoints,
        completionPoints: dist.completionPoints,
        maxSpeedBonus: dist.maxSpeedBonus,
        points: dist.points,
        totalPotentialPoints: dist.totalPotentialPoints
      });
    }
    database.exec(`RELEASE ${savepointName};`);
    return {
      success: true,
      missionCount: n,
      updatedMissions,
      summary: {
        totalUnlock: TOTAL_UNLOCK_POINTS,
        totalCompletion: TOTAL_COMPLETION_POINTS,
        totalSpeedBonus: TOTAL_SPEED_BONUS_POINTS,
        totalCircuitPoints: TOTAL_CIRCUIT_POINTS
      }
    };
  } catch (err) {
    database.exec(`ROLLBACK TO ${savepointName};`);
    database.exec(`RELEASE ${savepointName};`);
    throw err;
  }
}

// server/db/dailyRanking.ts
var DAILY_AWARD_DAYS = [
  {
    eventDate: "2026-11-24",
    dayLabel: "Dia 1 \u2014 24/11/2026",
    dayStartMs: Date.parse("2026-11-24T00:00:00.000-03:00"),
    scheduledCloseAtMs: Date.parse("2026-11-24T16:30:00.000-03:00"),
    scheduledCloseLabel: "24/11/2026 \xE0s 16h30 (Bras\xEDlia)"
  },
  {
    eventDate: "2026-11-25",
    dayLabel: "Dia 2 \u2014 25/11/2026",
    dayStartMs: Date.parse("2026-11-25T00:00:00.000-03:00"),
    scheduledCloseAtMs: Date.parse("2026-11-25T16:30:00.000-03:00"),
    scheduledCloseLabel: "25/11/2026 \xE0s 16h30 (Bras\xEDlia)"
  },
  {
    eventDate: "2026-11-26",
    dayLabel: "Dia 3 \u2014 26/11/2026",
    dayStartMs: Date.parse("2026-11-26T00:00:00.000-03:00"),
    scheduledCloseAtMs: Date.parse("2026-11-26T16:30:00.000-03:00"),
    scheduledCloseLabel: "26/11/2026 \xE0s 16h30 (Bras\xEDlia)"
  }
];
function ensureDailyRankingSchema(targetDb) {
  targetDb.exec(`
    CREATE TABLE IF NOT EXISTS daily_ranking_closures (
      event_date TEXT PRIMARY KEY,
      day_label TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Aberto',
      scheduled_close_at_ms INTEGER NOT NULL,
      closed_at_ms INTEGER,
      winner_participant_id TEXT,
      winner_display_name TEXT,
      winner_avatar TEXT,
      winner_daily_points INTEGER NOT NULL DEFAULT 0,
      winner_last_mission_completed_at_ms INTEGER,
      snapshot_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TRIGGER IF NOT EXISTS trg_daily_ranking_closures_immutable_update
    BEFORE UPDATE ON daily_ranking_closures
    WHEN OLD.status = 'Encerrado'
    BEGIN
      SELECT RAISE(ABORT, 'DAILY_RANKING_ALREADY_CLOSED');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_daily_ranking_closures_immutable_delete
    BEFORE DELETE ON daily_ranking_closures
    WHEN OLD.status = 'Encerrado'
    BEGIN
      SELECT RAISE(ABORT, 'DAILY_RANKING_IMMUTABLE');
    END;
  `);
  const insertDay = targetDb.prepare(`
    INSERT OR IGNORE INTO daily_ranking_closures (
      event_date, day_label, status, scheduled_close_at_ms, snapshot_json
    ) VALUES (?, ?, 'Aberto', ?, '[]')
  `);
  for (const day of DAILY_AWARD_DAYS) {
    insertDay.run(day.eventDate, day.dayLabel, day.scheduledCloseAtMs);
  }
}
function resolveTransactionTimestampMs(createdAtMs, createdAtText) {
  if (createdAtMs !== null && createdAtMs !== void 0 && Number.isFinite(Number(createdAtMs))) {
    return Number(createdAtMs);
  }
  if (!createdAtText) return null;
  const text = String(createdAtText).trim();
  const brMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})[,\s]+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (brMatch) {
    const [, dd, mm, yyyy, hh, min, sec = "00"] = brMatch;
    const parsed = Date.parse(`${yyyy}-${mm}-${dd}T${hh}:${min}:${sec}.000-03:00`);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(text)) {
    const parsed = Date.parse(text);
    return Number.isNaN(parsed) ? null : parsed;
  }
  const isoNaive = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (isoNaive) {
    const [, yyyy, mm, dd, hh, min, sec = "00"] = isoNaive;
    const parsed = Date.parse(`${yyyy}-${mm}-${dd}T${hh}:${min}:${sec}.000-03:00`);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}
var ELIGIBLE_DAILY_RANKING_SOURCE_TYPES = /* @__PURE__ */ new Set([
  "Miss\xE3o",
  "QR Code"
]);
function computeLiveDailyRanking(targetDb, dayConfig, currentUserId) {
  const participantsRows = targetDb.prepare(`
      SELECT id, name, nickname, avatar, show_nickname_in_public_ranking, status
      FROM participants
      WHERE UPPER(role) = 'PARTICIPANT' AND status = 'Ativo'
    `).all();
  const participantMap = new Map(participantsRows.map((p) => [p.id, p]));
  const extraMissionIds = new Set(
    targetDb.prepare("SELECT id FROM missions WHERE sequence_order IS NULL").all().map((m) => m.id)
  );
  const txRows = targetDb.prepare(`
      SELECT pt.id, pt.participant_id, pt.source_type, pt.points_delta, pt.created_at, pt.created_at_ms, pt.event_key, pt.mission_id
      FROM points_transactions pt
      INNER JOIN participants p ON p.id = pt.participant_id
      WHERE UPPER(p.role) = 'PARTICIPANT' AND p.status = 'Ativo'
    `).all();
  const legacyReversalKeys = /* @__PURE__ */ new Set();
  const simulationReversedTxIds = /* @__PURE__ */ new Set();
  for (const tx of txRows) {
    if (!tx.event_key) continue;
    if (tx.event_key.startsWith("REVERSAL:")) {
      legacyReversalKeys.add(tx.event_key);
    } else if (tx.event_key.startsWith("REVERSAL_SIMULATION:")) {
      const parts = tx.event_key.split(":");
      if (parts.length >= 3) {
        simulationReversedTxIds.add(parts.slice(2).join(":"));
      }
    }
  }
  const dailyPointsByParticipant = /* @__PURE__ */ new Map();
  const lastCompletedMsByParticipant = /* @__PURE__ */ new Map();
  const completedCountByParticipant = /* @__PURE__ */ new Map();
  for (const tx of txRows) {
    if (!ELIGIBLE_DAILY_RANKING_SOURCE_TYPES.has(tx.source_type)) continue;
    const delta = Number(tx.points_delta);
    if (delta <= 0) continue;
    if (tx.event_key?.startsWith("REVERSAL")) continue;
    if (simulationReversedTxIds.has(tx.id)) continue;
    if (tx.event_key && tx.event_key.startsWith("UNLOCK:")) {
      const suffix = tx.event_key.slice("UNLOCK:".length);
      if (legacyReversalKeys.has(`REVERSAL:${suffix}`)) continue;
    }
    const txMs = resolveTransactionTimestampMs(tx.created_at_ms, tx.created_at);
    if (txMs === null) continue;
    if (txMs < dayConfig.dayStartMs || txMs >= dayConfig.scheduledCloseAtMs) continue;
    dailyPointsByParticipant.set(
      tx.participant_id,
      (dailyPointsByParticipant.get(tx.participant_id) || 0) + delta
    );
    if (tx.mission_id && extraMissionIds.has(tx.mission_id) && !tx.event_key?.startsWith("UNLOCK") && !tx.event_key?.startsWith("SPEED_BONUS")) {
      const prev = lastCompletedMsByParticipant.get(tx.participant_id);
      if (prev === void 0 || txMs > prev) {
        lastCompletedMsByParticipant.set(tx.participant_id, txMs);
      }
      completedCountByParticipant.set(
        tx.participant_id,
        (completedCountByParticipant.get(tx.participant_id) || 0) + 1
      );
    }
  }
  const pmRows = targetDb.prepare(`
      SELECT pm.participant_id, pm.completed_at_ms
      FROM participant_missions pm
      INNER JOIN participants p ON p.id = pm.participant_id
      WHERE UPPER(p.role) = 'PARTICIPANT'
        AND p.status = 'Ativo'
        AND pm.status = 'Conclu\xEDda'
        AND pm.completed_at_ms IS NOT NULL
        AND pm.completed_at_ms >= ?
        AND pm.completed_at_ms < ?
    `).all(dayConfig.dayStartMs, dayConfig.scheduledCloseAtMs);
  for (const pm of pmRows) {
    const compMs = Number(pm.completed_at_ms);
    const prev = lastCompletedMsByParticipant.get(pm.participant_id);
    if (prev === void 0 || compMs > prev) {
      lastCompletedMsByParticipant.set(pm.participant_id, compMs);
    }
    completedCountByParticipant.set(
      pm.participant_id,
      (completedCountByParticipant.get(pm.participant_id) || 0) + 1
    );
  }
  const entries = [];
  for (const [participantId, dailyPoints] of dailyPointsByParticipant.entries()) {
    if (dailyPoints <= 0) continue;
    const p = participantMap.get(participantId);
    if (!p) continue;
    const displayName = Boolean(p.show_nickname_in_public_ranking) ? p.nickname : p.name;
    entries.push({
      participantId: p.id,
      displayName,
      avatar: p.avatar,
      dailyPoints,
      completedMissionsInDay: completedCountByParticipant.get(p.id) || 0,
      lastMissionCompletedAtMs: lastCompletedMsByParticipant.get(p.id) ?? null,
      isCurrentUser: currentUserId ? p.id === currentUserId : false
    });
  }
  entries.sort((a, b) => {
    if (b.dailyPoints !== a.dailyPoints) {
      return b.dailyPoints - a.dailyPoints;
    }
    const aMs = a.lastMissionCompletedAtMs ?? Number.MAX_SAFE_INTEGER;
    const bMs = b.lastMissionCompletedAtMs ?? Number.MAX_SAFE_INTEGER;
    if (aMs !== bMs) {
      return aMs - bMs;
    }
    return a.participantId.localeCompare(b.participantId);
  });
  return entries.map((entry, idx) => ({
    ...entry,
    position: idx + 1
  }));
}
function ensureDailyRankingsClosedUpTo(targetDb, nowMs = Date.now()) {
  const closedDates = [];
  const daysDue = DAILY_AWARD_DAYS.filter((day) => nowMs >= day.scheduledCloseAtMs);
  if (daysDue.length === 0) {
    return { closedDates };
  }
  const statusRows = targetDb.prepare("SELECT event_date, status FROM daily_ranking_closures").all();
  const statusByDate = new Map(statusRows.map((r) => [r.event_date, r.status]));
  for (const day of daysDue) {
    if (statusByDate.get(day.eventDate) === "Encerrado") {
      continue;
    }
    targetDb.exec("BEGIN IMMEDIATE TRANSACTION;");
    try {
      const existing = targetDb.prepare("SELECT status FROM daily_ranking_closures WHERE event_date = ? LIMIT 1").get(day.eventDate);
      if (existing && existing.status === "Encerrado") {
        targetDb.exec("COMMIT;");
        continue;
      }
      const finalRanking = computeLiveDailyRanking(targetDb, day).map((entry) => ({
        position: entry.position,
        participantId: entry.participantId,
        displayName: entry.displayName,
        avatar: entry.avatar,
        dailyPoints: entry.dailyPoints,
        completedMissionsInDay: entry.completedMissionsInDay,
        lastMissionCompletedAtMs: entry.lastMissionCompletedAtMs
      }));
      const winner = finalRanking[0] || null;
      targetDb.prepare(`
          UPDATE daily_ranking_closures
          SET status = 'Encerrado',
              closed_at_ms = ?,
              winner_participant_id = ?,
              winner_display_name = ?,
              winner_avatar = ?,
              winner_daily_points = ?,
              winner_last_mission_completed_at_ms = ?,
              snapshot_json = ?
          WHERE event_date = ? AND status != 'Encerrado'
        `).run(
        nowMs,
        winner ? winner.participantId : null,
        winner ? winner.displayName : null,
        winner ? winner.avatar : null,
        winner ? winner.dailyPoints : 0,
        winner ? winner.lastMissionCompletedAtMs : null,
        JSON.stringify(finalRanking),
        day.eventDate
      );
      targetDb.exec("COMMIT;");
      closedDates.push(day.eventDate);
    } catch (err) {
      try {
        targetDb.exec("ROLLBACK;");
      } catch (_) {
      }
      throw err;
    }
  }
  return { closedDates };
}
function getDailyRankingsFromDb(targetDb, options) {
  const nowMs = options?.nowMs ?? Date.now();
  const currentUserId = options?.currentUserId;
  ensureDailyRankingsClosedUpTo(targetDb, nowMs);
  const closureRows = targetDb.prepare("SELECT * FROM daily_ranking_closures ORDER BY event_date ASC").all();
  const closureByDate = new Map(closureRows.map((r) => [r.event_date, r]));
  return DAILY_AWARD_DAYS.map((day) => {
    const row = closureByDate.get(day.eventDate);
    const isClosed = row?.status === "Encerrado";
    if (isClosed && row) {
      const parsedSnapshot = JSON.parse(row.snapshot_json || "[]").map(
        (entry) => ({
          ...entry,
          isCurrentUser: currentUserId ? entry.participantId === currentUserId : false
        })
      );
      return {
        eventDate: day.eventDate,
        dayLabel: day.dayLabel,
        status: "Encerrado",
        scheduledCloseAtMs: day.scheduledCloseAtMs,
        scheduledCloseLabel: day.scheduledCloseLabel,
        closedAtMs: row.closed_at_ms,
        winner: row.winner_participant_id ? {
          participantId: row.winner_participant_id,
          displayName: row.winner_display_name || "Participante",
          avatar: row.winner_avatar || "PS",
          dailyPoints: Number(row.winner_daily_points || 0),
          lastMissionCompletedAtMs: row.winner_last_mission_completed_at_ms
        } : null,
        ranking: parsedSnapshot
      };
    }
    const liveRanking = computeLiveDailyRanking(targetDb, day, currentUserId);
    return {
      eventDate: day.eventDate,
      dayLabel: day.dayLabel,
      status: "Aberto",
      scheduledCloseAtMs: day.scheduledCloseAtMs,
      scheduledCloseLabel: day.scheduledCloseLabel,
      closedAtMs: null,
      winner: null,
      ranking: liveRanking
    };
  });
}

// server/db/evidenceStorage.ts
import crypto3 from "node:crypto";
import fs2 from "node:fs";
import path2 from "node:path";
import { fileURLToPath } from "node:url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
var DEFAULT_EVIDENCE_DIR = fs2.existsSync(path2.join(__dirname, "schema.sql")) ? path2.resolve(__dirname, "../storage/evidences") : path2.resolve(process.cwd(), "server/storage/evidences");
var EVIDENCE_STORAGE_DIR = process.env.DESAFIO_EVIDENCE_DIR ? path2.resolve(process.env.DESAFIO_EVIDENCE_DIR) : DEFAULT_EVIDENCE_DIR;
var MAX_EVIDENCE_SIZE_BYTES = 5 * 1024 * 1024;
var MAX_VIDEO_EVIDENCE_SIZE_BYTES = Number(
  process.env.MAX_VIDEO_EVIDENCE_BYTES || 25 * 1024 * 1024
);
var ALLOWED_FORMATS = [
  {
    canonicalExt: "jpg",
    extensions: [".jpg", ".jpeg"],
    mimeTypes: ["image/jpeg", "image/jpg"],
    isImage: true,
    isVideo: false,
    matchesMagicBytes: (buf) => buf.length >= 3 && buf[0] === 255 && buf[1] === 216 && buf[2] === 255
  },
  {
    canonicalExt: "png",
    extensions: [".png"],
    mimeTypes: ["image/png"],
    isImage: true,
    isVideo: false,
    matchesMagicBytes: (buf) => buf.length >= 8 && buf[0] === 137 && buf[1] === 80 && buf[2] === 78 && buf[3] === 71 && buf[4] === 13 && buf[5] === 10 && buf[6] === 26 && buf[7] === 10
  },
  {
    canonicalExt: "webp",
    extensions: [".webp"],
    mimeTypes: ["image/webp"],
    isImage: true,
    isVideo: false,
    matchesMagicBytes: (buf) => buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP"
  },
  {
    canonicalExt: "pdf",
    extensions: [".pdf"],
    mimeTypes: ["application/pdf"],
    isImage: false,
    isVideo: false,
    matchesMagicBytes: (buf) => buf.length >= 5 && buf.subarray(0, 5).toString("ascii") === "%PDF-"
  },
  {
    canonicalExt: "mp4",
    extensions: [".mp4"],
    mimeTypes: ["video/mp4"],
    isImage: false,
    isVideo: true,
    matchesMagicBytes: (buf) => buf.length >= 12 && buf.subarray(4, 8).toString("ascii") === "ftyp"
  },
  {
    canonicalExt: "mov",
    extensions: [".mov"],
    mimeTypes: ["video/quicktime", "video/mp4"],
    isImage: false,
    isVideo: true,
    matchesMagicBytes: (buf) => buf.length >= 12 && buf.subarray(4, 8).toString("ascii") === "ftyp"
  },
  {
    canonicalExt: "webm",
    extensions: [".webm"],
    mimeTypes: ["video/webm"],
    isImage: false,
    isVideo: true,
    matchesMagicBytes: (buf) => buf.length >= 4 && buf[0] === 26 && buf[1] === 69 && buf[2] === 223 && buf[3] === 163
  }
];
function extractMp4DurationSeconds(buf) {
  const findBox = (start, end, targetType) => {
    let offset = start;
    while (offset + 8 <= end) {
      let size = buf.readUInt32BE(offset);
      const type = buf.subarray(offset + 4, offset + 8).toString("ascii");
      let headerSize = 8;
      if (size === 1) {
        if (offset + 16 > end) return null;
        size = Number(buf.readBigUInt64BE(offset + 8));
        headerSize = 16;
      } else if (size === 0) {
        size = end - offset;
      }
      if (size < headerSize || offset + size > end) return null;
      if (type === targetType) {
        return { dataStart: offset + headerSize, boxEnd: offset + size };
      }
      offset += size;
    }
    return null;
  };
  const moov = findBox(0, buf.length, "moov");
  if (!moov) return null;
  const mvhd = findBox(moov.dataStart, moov.boxEnd, "mvhd");
  if (!mvhd || mvhd.dataStart + 20 > mvhd.boxEnd) return null;
  const version = buf[mvhd.dataStart];
  if (version === 0) {
    const timescale = buf.readUInt32BE(mvhd.dataStart + 12);
    const duration = buf.readUInt32BE(mvhd.dataStart + 16);
    if (timescale <= 0) return null;
    return duration / timescale;
  }
  if (version === 1) {
    if (mvhd.dataStart + 32 > mvhd.boxEnd) return null;
    const timescale = buf.readUInt32BE(mvhd.dataStart + 20);
    const duration = Number(buf.readBigUInt64BE(mvhd.dataStart + 24));
    if (timescale <= 0) return null;
    return duration / timescale;
  }
  return null;
}
function extractWebmDurationSeconds(buf) {
  const readVint = (offset2, maskFirstBit) => {
    if (offset2 >= buf.length) return null;
    const first = buf[offset2];
    if (first === 0) return null;
    let length = 1;
    let mask = 128;
    while (length <= 8 && (first & mask) === 0) {
      mask >>= 1;
      length += 1;
    }
    if (length > 8 || offset2 + length > buf.length) return null;
    let value = maskFirstBit ? first & mask - 1 : first;
    for (let i = 1; i < length; i++) {
      value = value * 256 + buf[offset2 + i];
    }
    return { value, length };
  };
  const scanInfo = (start, end) => {
    let offset2 = start;
    let timecodeScale = 1e6;
    let rawDuration = null;
    while (offset2 < end) {
      const idVint = readVint(offset2, false);
      if (!idVint) break;
      offset2 += idVint.length;
      const sizeVint = readVint(offset2, true);
      if (!sizeVint) break;
      offset2 += sizeVint.length;
      const dataEnd = Math.min(end, offset2 + sizeVint.value);
      if (idVint.value === 2807729 && sizeVint.value > 0 && sizeVint.value <= 8) {
        let scale = 0;
        for (let i = offset2; i < dataEnd; i++) {
          scale = scale * 256 + buf[i];
        }
        if (scale > 0) timecodeScale = scale;
      } else if (idVint.value === 17545) {
        if (sizeVint.value === 4 && offset2 + 4 <= end) {
          rawDuration = buf.readFloatBE(offset2);
        } else if (sizeVint.value === 8 && offset2 + 8 <= end) {
          rawDuration = buf.readDoubleBE(offset2);
        }
      }
      offset2 = dataEnd;
    }
    if (rawDuration === null || !Number.isFinite(rawDuration) || rawDuration <= 0) {
      return null;
    }
    return rawDuration * timecodeScale / 1e9;
  };
  let offset = 0;
  while (offset < buf.length) {
    const idVint = readVint(offset, false);
    if (!idVint) break;
    offset += idVint.length;
    const sizeVint = readVint(offset, true);
    if (!sizeVint) break;
    offset += sizeVint.length;
    const isUnknownSize = sizeVint.value === Math.pow(2, 7 * sizeVint.length) - 1;
    const dataEnd = isUnknownSize ? buf.length : Math.min(buf.length, offset + sizeVint.value);
    if (idVint.value === 408125543) {
      let segOffset = offset;
      while (segOffset < dataEnd) {
        const childId = readVint(segOffset, false);
        if (!childId) break;
        segOffset += childId.length;
        const childSize = readVint(segOffset, true);
        if (!childSize) break;
        segOffset += childSize.length;
        const childEnd = Math.min(dataEnd, segOffset + childSize.value);
        if (childId.value === 357149030) {
          return scanInfo(segOffset, childEnd);
        }
        segOffset = childEnd;
      }
      return null;
    }
    offset = dataEnd;
  }
  return null;
}
function extractVideoDurationSeconds(buf, canonicalExt) {
  if (canonicalExt === "webm") {
    return extractWebmDurationSeconds(buf);
  }
  return extractMp4DurationSeconds(buf);
}
function sanitizeDisplayFileName(rawName) {
  const base = path2.basename(String(rawName || "evidencia")).replace(/[\x00-\x1f\x7f<>:"/\\|?*]+/g, "_").trim();
  return base.slice(0, 120) || "evidencia";
}
function missionAcceptsVideo(requiredType) {
  return requiredType === "video" || requiredType === "photo_or_video";
}
function validateAndDetectEvidenceFile(params) {
  const { buffer, originalName, declaredMimeType, requiredType, maxVideoSeconds } = params;
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return {
      ok: false,
      httpStatus: 400,
      code: "EMPTY_FILE",
      error: "Nenhum arquivo v\xE1lido foi enviado."
    };
  }
  const safeDisplayName = sanitizeDisplayFileName(originalName);
  const ext = path2.extname(safeDisplayName).toLowerCase();
  const normMime = String(declaredMimeType || "").split(";")[0].trim().toLowerCase();
  const formatByExt = ALLOWED_FORMATS.find((f) => f.extensions.includes(ext));
  if (!formatByExt) {
    return {
      ok: false,
      httpStatus: 400,
      code: "UNSUPPORTED_EXTENSION",
      error: missionAcceptsVideo(requiredType) ? "Formato de arquivo n\xE3o permitido. Utilize MP4, MOV, WEBM, JPG, JPEG, PNG ou WEBP conforme a miss\xE3o." : "Formato de arquivo n\xE3o permitido. Utilize JPG, JPEG, PNG, WEBP ou PDF."
    };
  }
  if ((requiredType === "photo" || requiredType === "print") && !formatByExt.isImage) {
    return {
      ok: false,
      httpStatus: 400,
      code: "PHOTO_REQUIRED",
      error: requiredType === "print" ? "Esta miss\xE3o exige o envio de um print em imagem (JPG, JPEG, PNG ou WEBP)." : "Esta miss\xE3o exige o envio de uma foto (JPG, JPEG, PNG ou WEBP)."
    };
  }
  if (requiredType === "video" && !formatByExt.isVideo) {
    return {
      ok: false,
      httpStatus: 400,
      code: "VIDEO_REQUIRED",
      error: "Esta miss\xE3o exige obrigatoriamente o envio de um v\xEDdeo (MP4, MOV ou WEBM). N\xE3o \xE9 permitido substituir por foto ou texto."
    };
  }
  if (requiredType === "photo_or_video" && !formatByExt.isImage && !formatByExt.isVideo) {
    return {
      ok: false,
      httpStatus: 400,
      code: "PHOTO_OR_VIDEO_REQUIRED",
      error: "Esta miss\xE3o aceita foto/print (JPG, PNG, WEBP) ou v\xEDdeo (MP4, MOV, WEBM)."
    };
  }
  if ((requiredType === "file" || requiredType === "both") && formatByExt.isVideo) {
    return {
      ok: false,
      httpStatus: 400,
      code: "VIDEO_NOT_ALLOWED",
      error: "Esta miss\xE3o n\xE3o aceita v\xEDdeos. Envie JPG, JPEG, PNG, WEBP ou PDF."
    };
  }
  const effectiveMaxBytes = formatByExt.isVideo ? MAX_VIDEO_EVIDENCE_SIZE_BYTES : MAX_EVIDENCE_SIZE_BYTES;
  if (buffer.length > effectiveMaxBytes) {
    const limitMb = Math.round(effectiveMaxBytes / (1024 * 1024));
    return {
      ok: false,
      httpStatus: 413,
      code: "FILE_TOO_LARGE",
      error: `O arquivo excede o limite m\xE1ximo permitido de ${limitMb} MB.`
    };
  }
  if (!formatByExt.mimeTypes.includes(normMime)) {
    return {
      ok: false,
      httpStatus: 400,
      code: "MIME_MISMATCH",
      error: "O tipo MIME do arquivo n\xE3o corresponde \xE0 sua extens\xE3o."
    };
  }
  if (!formatByExt.matchesMagicBytes(buffer)) {
    return {
      ok: false,
      httpStatus: 400,
      code: "INVALID_FILE_SIGNATURE",
      error: "Conte\xFAdo do arquivo inv\xE1lido ou incompat\xEDvel com o formato declarado."
    };
  }
  let durationSeconds = null;
  if (formatByExt.isVideo) {
    const extracted = extractVideoDurationSeconds(
      buffer,
      formatByExt.canonicalExt
    );
    if (extracted !== null && Number.isFinite(extracted) && extracted > 0) {
      durationSeconds = Math.ceil(extracted);
    }
    if (maxVideoSeconds !== null && maxVideoSeconds !== void 0 && maxVideoSeconds > 0) {
      if (extracted === null || !Number.isFinite(extracted) || extracted <= 0) {
        return {
          ok: false,
          httpStatus: 400,
          code: "INVALID_VIDEO_METADATA",
          error: "N\xE3o foi poss\xEDvel verificar a dura\xE7\xE3o do v\xEDdeo enviado. Grave ou exporte o v\xEDdeo em MP4, MOV ou WEBM v\xE1lido."
        };
      }
      if (extracted > maxVideoSeconds + 1) {
        return {
          ok: false,
          httpStatus: 400,
          code: "VIDEO_DURATION_EXCEEDED",
          error: `O v\xEDdeo excede a dura\xE7\xE3o m\xE1xima permitida de ${maxVideoSeconds} segundos (dura\xE7\xE3o detectada: ${Math.ceil(extracted)}s).`
        };
      }
    }
  }
  const storedName = `${crypto3.randomUUID()}.${formatByExt.canonicalExt}`;
  const sha256 = crypto3.createHash("sha256").update(buffer).digest("hex");
  const canonicalMime = formatByExt.mimeTypes[0];
  return {
    ok: true,
    canonicalExt: formatByExt.canonicalExt,
    mimeType: canonicalMime,
    isImage: formatByExt.isImage,
    isVideo: formatByExt.isVideo,
    durationSeconds,
    safeDisplayName,
    storedName,
    sizeBytes: buffer.length,
    sha256
  };
}
function ensureEvidenceStorageDir(storageDir = EVIDENCE_STORAGE_DIR) {
  fs2.mkdirSync(storageDir, { recursive: true });
}
function saveEvidenceFileToDisk(buffer, storedName, storageDir = EVIDENCE_STORAGE_DIR) {
  ensureEvidenceStorageDir(storageDir);
  const fullPath = resolveSafeEvidenceFilePath(storedName, storageDir);
  fs2.writeFileSync(fullPath, buffer, { flag: "wx" });
  return fullPath;
}
function deleteEvidenceFileIfExists(storedName, storageDir = EVIDENCE_STORAGE_DIR) {
  try {
    const fullPath = resolveSafeEvidenceFilePath(storedName, storageDir);
    if (fs2.existsSync(fullPath)) {
      fs2.unlinkSync(fullPath);
    }
  } catch {
  }
}
function resolveSafeEvidenceFilePath(storedName, storageDir = EVIDENCE_STORAGE_DIR) {
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp|pdf|mp4|mov|webm)$/i.test(storedName)) {
    throw new Error("INVALID_STORED_EVIDENCE_NAME");
  }
  const resolvedDir = path2.resolve(storageDir);
  const fullPath = path2.resolve(resolvedDir, storedName);
  if (!fullPath.startsWith(resolvedDir + path2.sep)) {
    throw new Error("PATH_TRAVERSAL_BLOCKED");
  }
  return fullPath;
}

// server/db/database.ts
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path3.dirname(__filename2);
var DB_DIR = fs3.existsSync(path3.join(__dirname2, "schema.sql")) ? __dirname2 : path3.resolve(process.cwd(), "server/db");
var DB_FILE_PATH = process.env.DESAFIO_DB_PATH ? path3.resolve(process.env.DESAFIO_DB_PATH) : path3.join(DB_DIR, "desafio_global.sqlite");
var SCHEMA_FILE_PATH = path3.join(DB_DIR, "schema.sql");
var db = new Database(DB_FILE_PATH);
var isDatabaseClosed = false;
function closeDatabaseGracefully() {
  if (isDatabaseClosed) {
    return { checkpointed: true, closed: true };
  }
  let checkpointed = false;
  try {
    db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
    checkpointed = true;
  } catch (err) {
    console.error("[SQLite] Aviso ao executar wal_checkpoint(TRUNCATE) no encerramento:", err);
  }
  try {
    db.close();
    isDatabaseClosed = true;
    return { checkpointed, closed: true };
  } catch (err) {
    console.error("[SQLite] Erro ao fechar conex\xE3o SQLite:", err);
    return { checkpointed, closed: false };
  }
}
var MAX_PARTICIPANT_POINTS = 1e3;
var MISSION_UNLOCK_POINTS = 20;
var MISSION_COMPLETION_POINTS = 180;
var MISSION_MAX_SPEED_BONUS = 50;
var DEFAULT_MISSION_TIMER_MINUTES = 5;
var MIN_MISSION_TIMER_MINUTES = 1;
var MAX_MISSION_TIMER_MINUTES = 30;
function ensureColumnExists(tableName, columnName, columnDefinition) {
  const cols = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = cols.some((c) => c.name.toLowerCase() === columnName.toLowerCase());
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition};`);
  }
}
function getMissionConfiguredDurationSeconds(missionId) {
  const missionRow = db.prepare("SELECT timer_minutes FROM missions WHERE id = ? LIMIT 1").get(missionId);
  if (missionRow && missionRow.timer_minutes !== null && missionRow.timer_minutes !== void 0) {
    const min = Math.max(
      MIN_MISSION_TIMER_MINUTES,
      Math.min(MAX_MISSION_TIMER_MINUTES, Math.trunc(Number(missionRow.timer_minutes)))
    );
    return min * 60;
  }
  const settingsRow = db.prepare("SELECT default_mission_timer_minutes FROM event_settings WHERE id = 1 LIMIT 1").get();
  const globalMin = settingsRow?.default_mission_timer_minutes ? Math.max(
    MIN_MISSION_TIMER_MINUTES,
    Math.min(
      MAX_MISSION_TIMER_MINUTES,
      Math.trunc(Number(settingsRow.default_mission_timer_minutes))
    )
  ) : DEFAULT_MISSION_TIMER_MINUTES;
  return globalMin * 60;
}
function isTransactionReversedBySimulation(participantId, transactionId, targetDb = db) {
  const reversal = targetDb.prepare("SELECT id FROM points_transactions WHERE event_key = ? LIMIT 1").get(`REVERSAL_SIMULATION:${participantId}:${transactionId}`);
  return Boolean(reversal);
}
function findActiveTransactionByEventKeys(participantId, eventKeys, targetDb = db) {
  const stmt = targetDb.prepare(
    "SELECT id, points_delta, event_key FROM points_transactions WHERE event_key = ? LIMIT 1"
  );
  for (const key of eventKeys) {
    const tx = stmt.get(key);
    if (tx && !isTransactionReversedBySimulation(participantId, tx.id, targetDb)) {
      return tx;
    }
  }
  return void 0;
}
function resolveNextIdempotentEventKey(participantId, baseEventKey, postReversalEventKey = `${baseEventKey}:POST_SIM_REV`, targetDb = db) {
  const existingBase = targetDb.prepare("SELECT id FROM points_transactions WHERE event_key = ? LIMIT 1").get(baseEventKey);
  if (existingBase && isTransactionReversedBySimulation(participantId, existingBase.id, targetDb)) {
    return postReversalEventKey;
  }
  return baseEventKey;
}
function calculateParticipantReservedPoints(participantId) {
  const partRow = db.prepare("SELECT id, points FROM participants WHERE id = ? LIMIT 1").get(participantId);
  const currentPoints = partRow ? Number(partRow.points || 0) : 0;
  const seqMissions = db.prepare(`
      SELECT id, title, sequence_order, unlock_points, completion_points, max_speed_bonus
      FROM missions
      WHERE sequence_order IS NOT NULL AND active = 1
      ORDER BY sequence_order ASC
    `).all();
  const pmRows = db.prepare("SELECT * FROM participant_missions WHERE participant_id = ?").all(participantId);
  const pmByMissionId = /* @__PURE__ */ new Map();
  for (const pm of pmRows) {
    pmByMissionId.set(String(pm.mission_id), pm);
  }
  let totalReservedPoints = 0;
  const missionBreakdown = [];
  for (const m of seqMissions) {
    const pm = pmByMissionId.get(m.id);
    const seq = Number(m.sequence_order);
    const unlockTx = findActiveTransactionByEventKeys(participantId, [
      `UNLOCK:${participantId}:${m.id}`,
      `UNLOCK:${participantId}:${m.id}:POST_SIM_REV`
    ]);
    const reversalTx = db.prepare("SELECT id FROM points_transactions WHERE event_key = ? LIMIT 1").get(`REVERSAL:${participantId}:${m.id}`);
    const validatedUnlockTx = findActiveTransactionByEventKeys(participantId, [
      `UNLOCK_VALIDATED:${participantId}:${m.id}`,
      `UNLOCK_VALIDATED:${participantId}:${m.id}:POST_SIM_REV`
    ]);
    const completeTx = findActiveTransactionByEventKeys(participantId, [
      `COMPLETE:${participantId}:${m.id}`,
      `COMPLETE:${participantId}:${m.id}:POST_SIM_REV`
    ]);
    const hasEffectiveUnlockPoints = Boolean(unlockTx) && !Boolean(reversalTx) || Boolean(validatedUnlockTx) || pm !== void 0 && Number(pm.unlock_points_awarded || 0) > 0;
    const isCompleted = Boolean(completeTx) || pm !== void 0 && (String(pm.status) === "Conclu\xEDda" || Number(pm.completion_points_awarded || 0) > 0);
    const missionUnlock = m.unlock_points !== null && m.unlock_points !== void 0 ? Number(m.unlock_points) : 0;
    const remainingUnlock = hasEffectiveUnlockPoints ? 0 : missionUnlock;
    const missionCompletion = m.completion_points !== null && m.completion_points !== void 0 ? Number(m.completion_points) : 0;
    const remainingCompletion = isCompleted ? 0 : missionCompletion;
    const maxBonus = m.max_speed_bonus !== null && m.max_speed_bonus !== void 0 ? Number(m.max_speed_bonus) : 0;
    const awardedBonus = pm ? Number(pm.speed_bonus_awarded || 0) : 0;
    const remainingSpeedBonus = isCompleted ? 0 : Math.max(0, maxBonus - awardedBonus);
    const totalMissionReserved = remainingUnlock + remainingCompletion + remainingSpeedBonus;
    totalReservedPoints += totalMissionReserved;
    let computedStatus = "Bloqueada";
    const isAvailableOrUnlocked = seq === 1 || pm !== void 0 && String(pm.status) !== "Bloqueada";
    if (isCompleted) {
      computedStatus = "Conclu\xEDda";
    } else if (isAvailableOrUnlocked) {
      computedStatus = pm ? String(pm.status) : "Dispon\xEDvel";
    }
    missionBreakdown.push({
      missionId: m.id,
      sequenceOrder: seq,
      title: m.title,
      status: computedStatus,
      remainingUnlock,
      remainingCompletion,
      remainingSpeedBonus,
      totalMissionReserved
    });
  }
  const freeMargin = Math.max(0, MAX_PARTICIPANT_POINTS - currentPoints - totalReservedPoints);
  return {
    participantId,
    currentPoints,
    maxPoints: MAX_PARTICIPANT_POINTS,
    totalReservedPoints,
    freeMargin,
    missionBreakdown
  };
}
function ensureParticipantFirstMissionUnlockedInDb(participantId) {
  const savepointName = `sp_unlock_${Date.now()}_${Math.random().toString(36).replace(/[^a-zA-Z0-9_]/g, "")}`;
  db.exec(`SAVEPOINT ${savepointName};`);
  try {
    const partRow = db.prepare("SELECT * FROM participants WHERE id = ? AND UPPER(role) = 'PARTICIPANT' LIMIT 1").get(participantId);
    if (!partRow) {
      db.exec(`RELEASE ${savepointName};`);
      return;
    }
    const seqMissions = db.prepare(
      "SELECT * FROM missions WHERE sequence_order IS NOT NULL AND active = 1 ORDER BY COALESCE(track_id, 'default') ASC, sequence_order ASC"
    ).all();
    if (seqMissions.length === 0) {
      db.exec(`RELEASE ${savepointName};`);
      return;
    }
    const nowMs = Date.now();
    for (const mRow of seqMissions) {
      const mId = String(mRow.id);
      const seqOrder = Number(mRow.sequence_order);
      if (seqOrder === 1) {
        db.prepare(`
          INSERT INTO participant_missions (
            id, participant_id, mission_id, sequence_order, status,
            unlocked_at_ms, unlock_points_awarded, completion_points_awarded,
            speed_bonus_awarded, total_points_awarded
          ) VALUES (?, ?, ?, 1, 'Dispon\xEDvel', ?, 0, 0, 0, 0)
          ON CONFLICT(participant_id, mission_id) DO UPDATE SET
            status = CASE
              WHEN participant_missions.status IN ('Conclu\xEDda', 'Em andamento', 'Aguardando valida\xE7\xE3o')
                THEN participant_missions.status
              ELSE 'Dispon\xEDvel'
            END,
            unlocked_at_ms = COALESCE(participant_missions.unlocked_at_ms, excluded.unlocked_at_ms)
        `).run(
          `pm-${participantId}-${mId}`,
          participantId,
          mId,
          nowMs
        );
      } else {
        db.prepare(`
          INSERT INTO participant_missions (
            id, participant_id, mission_id, sequence_order, status,
            unlocked_at_ms, unlock_points_awarded, completion_points_awarded,
            speed_bonus_awarded, total_points_awarded
          ) VALUES (?, ?, ?, ?, 'Bloqueada', NULL, 0, 0, 0, 0)
          ON CONFLICT(participant_id, mission_id) DO NOTHING
        `).run(
          `pm-${participantId}-${mId}`,
          participantId,
          mId,
          seqOrder
        );
      }
    }
    db.exec(`RELEASE ${savepointName};`);
  } catch (err) {
    db.exec(`ROLLBACK TO ${savepointName};`);
    console.error(`[SQLite] Erro ao garantir disponibilidade da 1\xAA miss\xE3o para ${participantId}:`, err);
  }
}
function reconcileLegacyFirstMissionUnlockPointsInDb() {
  const savepointName = `sp_reconcile_${Date.now()}_${Math.random().toString(36).replace(/[^a-zA-Z0-9_]/g, "")}`;
  db.exec(`SAVEPOINT ${savepointName};`);
  try {
    const nowMs = Date.now();
    const nowStr = (/* @__PURE__ */ new Date()).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    const legacyUnlockTxs = db.prepare(`
      SELECT pt.id as tx_id, pt.participant_id, pt.points_delta, pt.event_key,
             p.name as participant_name, p.points as current_points, p.completed_missions_count
      FROM points_transactions pt
      JOIN participants p ON p.id = pt.participant_id
      WHERE pt.event_key LIKE 'UNLOCK:%:ms-01'
        AND pt.points_delta = 20
        AND UPPER(p.role) = 'PARTICIPANT'
    `).all();
    for (const tx of legacyUnlockTxs) {
      const partId = String(tx.participant_id);
      const reversalEventKey = `REVERSAL:${partId}:ms-01`;
      const existingReversal = db.prepare(
        "SELECT id FROM points_transactions WHERE event_key = ? LIMIT 1"
      ).get(reversalEventKey);
      if (existingReversal) {
        continue;
      }
      const completeTx = db.prepare(
        "SELECT id FROM points_transactions WHERE event_key = ? LIMIT 1"
      ).get(`COMPLETE:${partId}:ms-01`);
      const pmRow = db.prepare(
        "SELECT status, completion_points_awarded FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1"
      ).get(partId, "ms-01");
      const hasCompletedMission1 = Boolean(completeTx) || pmRow && (String(pmRow.status) === "Conclu\xEDda" || Number(pmRow.completion_points_awarded) > 0);
      if (hasCompletedMission1) {
        continue;
      }
      const freshPart = db.prepare("SELECT id, name, points FROM participants WHERE id = ?").get(partId);
      if (!freshPart) continue;
      const prevBal = Number(freshPart.points || 0);
      const newBal = Math.max(0, prevBal - 20);
      const reversalDelta = newBal - prevBal;
      const reversalTxId = `tx-rev-${nowMs}-${Math.random().toString(36).replace(/[^a-zA-Z0-9_]/g, "").slice(0, 6)}`;
      const revInsertRes = db.prepare(`
        INSERT OR IGNORE INTO points_transactions (
          id, participant_id, participant_name, source_type, source_title,
          points_delta, previous_balance, new_balance, created_at, event_key, mission_id
        ) VALUES (?, ?, ?, 'Ajuste', 'Estorno: Desbloqueio antecipado da Miss\xE3o 1 (Regra Etapa 6)', ?, ?, ?, ?, ?, 'ms-01')
      `).run(
        reversalTxId,
        partId,
        String(freshPart.name),
        reversalDelta,
        prevBal,
        newBal,
        nowStr,
        reversalEventKey
      );
      if (Number(revInsertRes.changes) === 1) {
        db.prepare("UPDATE participants SET points = ? WHERE id = ?").run(newBal, partId);
        db.prepare(`
          UPDATE participant_missions
          SET unlock_points_awarded = 0,
              total_points_awarded = completion_points_awarded + speed_bonus_awarded
          WHERE participant_id = ? AND mission_id = 'ms-01'
        `).run(partId);
      }
    }
    db.exec(`RELEASE ${savepointName};`);
  } catch (err) {
    db.exec(`ROLLBACK TO ${savepointName};`);
    console.error("[SQLite] Erro ao executar estorno de desbloqueios antecipados da Miss\xE3o 1:", err);
    throw err;
  }
}
function initializeDatabase() {
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec("PRAGMA foreign_keys = ON;");
  const schemaSql = fs3.readFileSync(SCHEMA_FILE_PATH, "utf-8");
  db.exec(schemaSql);
  db.exec("BEGIN TRANSACTION;");
  try {
    db.prepare(
      "UPDATE participants SET role = 'PARTICIPANT' WHERE LOWER(role) = 'participant' OR role IS NULL OR TRIM(role) = ''"
    ).run();
    db.prepare("UPDATE participants SET role = 'ADMIN' WHERE LOWER(role) = 'admin'").run();
    const envAdminEmail = process.env.ADMIN_INITIAL_EMAIL?.trim().toLowerCase();
    const envAdminPassword = process.env.ADMIN_INITIAL_PASSWORD;
    const envAdminName = process.env.ADMIN_INITIAL_NAME?.trim() || "Administrador Geral";
    if (envAdminEmail && envAdminPassword) {
      if (envAdminPassword.length < 8) {
        console.warn(
          "[RBAC] ADMIN_INITIAL_PASSWORD deve possuir no m\xEDnimo 8 caracteres. Provisionamento ignorado."
        );
      } else {
        const passwordHash = hashPassword(envAdminPassword);
        const existingUser = db.prepare("SELECT id FROM participants WHERE LOWER(email) = ?").get(envAdminEmail);
        if (existingUser) {
          db.prepare(
            "UPDATE participants SET role = 'ADMIN', password_hash = ?, status = 'Ativo' WHERE id = ?"
          ).run(passwordHash, existingUser.id);
          console.log(`[RBAC] Conta administrativa atualizada via ambiente: ${envAdminEmail}`);
        } else {
          const adminId = `admin-${Date.now()}`;
          const initials = envAdminName.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
          const nowStr = (/* @__PURE__ */ new Date()).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          });
          db.prepare(`
            INSERT INTO participants (
              id, name, nickname, email, password_hash, role, avatar, points,
              ranking_position, completed_missions_count, visited_startups_json,
              registered_at, status,
              show_nickname_in_public_ranking, allow_activity_notifications,
              share_startup_interests, is_current_session
            ) VALUES (?, ?, ?, ?, ?, 'ADMIN', ?, 0, 1, 0, '[]', ?, 'Ativo', 1, 1, 0, 0)
          `).run(
            adminId,
            envAdminName,
            envAdminName.split(/\s+/)[0],
            envAdminEmail,
            passwordHash,
            initials || "AD",
            nowStr
          );
          console.log(`[RBAC] Primeira conta administrativa criada via ambiente: ${envAdminEmail}`);
        }
      }
    }
    const settingsCount = db.prepare("SELECT COUNT(*) as total FROM event_settings").get().total;
    if (settingsCount === 0) {
      db.prepare(`
        INSERT OR IGNORE INTO event_settings (
          id, event_name, edition_year, dates, location, city, description,
          active_period, scoring_rules_json, tie_breaker_criteria_json,
          rewards_enabled, rewards_legal_note, rewards_description
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        initialEventSettings.eventName,
        initialEventSettings.editionYear,
        initialEventSettings.dates,
        initialEventSettings.location,
        initialEventSettings.city,
        initialEventSettings.description,
        initialEventSettings.activePeriod,
        JSON.stringify(initialEventSettings.scoringRules),
        JSON.stringify(initialEventSettings.tieBreakerCriteria),
        initialEventSettings.rewardsEnabled ? 1 : 0,
        initialEventSettings.rewardsLegalNote,
        initialEventSettings.rewardsDescription
      );
    }
    const startupsCount = db.prepare("SELECT COUNT(*) as total FROM startups").get().total;
    if (startupsCount === 0) {
      const insertStartup = db.prepare(`
        INSERT OR IGNORE INTO startups (
          id, name, short_name, tagline, description, category,
          solution_presentation, booth_number, logo_text, available_points,
          active, is_configurable_guest, website
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const s of initialStartups) {
        insertStartup.run(
          s.id,
          s.name,
          s.shortName,
          s.tagline,
          s.description,
          s.category,
          s.solutionPresentation,
          s.boothNumber,
          s.logoText,
          s.availablePoints,
          s.active ? 1 : 0,
          s.isConfigurableGuest ? 1 : 0,
          s.website || null
        );
      }
    }
    const missionsCount = db.prepare("SELECT COUNT(*) as total FROM missions").get().total;
    if (missionsCount === 0) {
      const insertMission = db.prepare(`
        INSERT OR IGNORE INTO missions (
          id, title, description, startup_id, startup_name, category,
          points, estimated_time, status, period, completion_criteria,
          active, qr_code_required, quiz_questions_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const m of initialMissions) {
        insertMission.run(
          m.id,
          m.title,
          m.description,
          m.startupId,
          m.startupName,
          m.category,
          m.points,
          m.estimatedTime,
          m.status,
          m.period,
          m.completionCriteria,
          m.active ? 1 : 0,
          m.qrCodeRequired || null,
          m.quizQuestions ? JSON.stringify(m.quizQuestions) : null
        );
      }
    }
    const qrCount = db.prepare("SELECT COUNT(*) as total FROM qr_codes").get().total;
    if (qrCount === 0) {
      const insertQR = db.prepare(`
        INSERT OR IGNORE INTO qr_codes (
          id, code, label, startup_id, startup_name, mission_id,
          mission_title, points, scans_count, active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `);
      for (const q of initialQRCodes) {
        insertQR.run(
          q.id,
          q.code,
          q.label,
          q.startupId,
          q.startupName,
          q.missionId,
          q.missionTitle,
          q.points,
          q.active ? 1 : 0,
          q.createdAt
        );
      }
    }
    const govCount = db.prepare("SELECT COUNT(*) as total FROM governance_plans").get().total;
    if (govCount === 0) {
      const insertPlan = db.prepare(`
        INSERT OR IGNORE INTO governance_plans (
          id, code, name, objective, description, responsible,
          indicators, status, related_documents_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const plan of initialGovernancePlans) {
        insertPlan.run(
          plan.id,
          plan.code,
          plan.name,
          plan.objective,
          plan.description,
          plan.responsible,
          plan.indicators,
          plan.status,
          JSON.stringify(plan.relatedDocuments)
        );
      }
    }
    ensureColumnExists("missions", "unlock_points", "INTEGER NOT NULL DEFAULT 20");
    ensureColumnExists("missions", "completion_points", "INTEGER NOT NULL DEFAULT 180");
    ensureColumnExists("missions", "max_speed_bonus", "INTEGER NOT NULL DEFAULT 50");
    ensureColumnExists("missions", "sequence_order", "INTEGER");
    ensureColumnExists("missions", "track_id", "TEXT");
    ensureColumnExists("missions", "relative_weight", "INTEGER NOT NULL DEFAULT 10");
    ensureColumnExists("missions", "max_video_seconds", "INTEGER");
    ensureColumnExists("missions", "allow_shared_evidence", "INTEGER NOT NULL DEFAULT 0");
    ensureColumnExists("missions", "is_surprise", "INTEGER NOT NULL DEFAULT 0");
    ensureColumnExists("missions", "external_link", "TEXT");
    ensureColumnExists("startups", "instagram_url", "TEXT");
    ensureColumnExists("startups", "logo_path", "TEXT");
    ensureColumnExists("points_transactions", "event_key", "TEXT");
    ensureColumnExists("points_transactions", "mission_id", "TEXT");
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_points_tx_unique_event
      ON points_transactions(event_key)
      WHERE event_key IS NOT NULL;
    `);
    db.exec(`
      DELETE FROM qr_scans
      WHERE rowid NOT IN (
        SELECT MIN(rowid)
        FROM qr_scans
        GROUP BY qr_code_id, participant_id
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_scans_unique_participant
      ON qr_scans(qr_code_id, participant_id);
    `);
    const hasOfficialTracksCatalog = Number(
      db.prepare("SELECT COUNT(*) as total FROM missions WHERE track_id IS NOT NULL").get()?.total || 0
    ) > 0;
    if (!hasOfficialTracksCatalog) {
      db.prepare(
        "UPDATE startups SET available_points = 250 WHERE id IN ('st-tutu', 'st-escrevelab', 'st-futurize', 'st-convidada')"
      ).run();
      const sequentialMissionsConfig = [
        {
          id: "ms-01",
          seq: 1,
          status: "Dispon\xEDvel",
          criteria: "Miss\xE3o 01/04 \u2022 Desbloqueio: +20 pts | Conclus\xE3o (QR Code TUTU-2026): +180 pts."
        },
        {
          id: "ms-04",
          seq: 2,
          status: "Bloqueada",
          criteria: "Miss\xE3o 02/04 \u2022 Desbloqueada ap\xF3s concluir a Miss\xE3o 01 (+20 pts) | Conclus\xE3o (QR Code ESCREVE-PITCH): +180 pts."
        },
        {
          id: "ms-06",
          seq: 3,
          status: "Bloqueada",
          criteria: "Miss\xE3o 03/04 \u2022 Desbloqueada ap\xF3s concluir a Miss\xE3o 02 (+20 pts) | Conclus\xE3o (QR Code FUTURIZE-2030): +180 pts."
        },
        {
          id: "ms-08",
          seq: 4,
          status: "Bloqueada",
          criteria: "Miss\xE3o 04/04 \u2022 Desbloqueada ap\xF3s concluir a Miss\xE3o 03 (+20 pts) | Conclus\xE3o (QR Code SUMMIT-SURPRESA): +180 pts."
        }
      ];
      for (const cfg of sequentialMissionsConfig) {
        db.prepare(`
          UPDATE missions
          SET sequence_order = ?,
              points = ?,
              unlock_points = ?,
              completion_points = ?,
              max_speed_bonus = ?,
              status = ?,
              completion_criteria = ?,
              active = 1
          WHERE id = ?
        `).run(
          cfg.seq,
          MISSION_COMPLETION_POINTS,
          MISSION_UNLOCK_POINTS,
          MISSION_COMPLETION_POINTS,
          MISSION_MAX_SPEED_BONUS,
          cfg.status,
          cfg.criteria,
          cfg.id
        );
      }
      db.prepare(
        "UPDATE missions SET sequence_order = NULL, active = 0 WHERE id IN ('ms-02', 'ms-03', 'ms-05', 'ms-07')"
      ).run();
      db.prepare("UPDATE qr_codes SET points = ?").run(MISSION_COMPLETION_POINTS);
      db.prepare(
        "UPDATE qr_codes SET mission_id = 'ms-01', mission_title = 'Check-in no Estande Tutu (Ex Devedor)' WHERE id = 'qr-02'"
      ).run();
    }
    ensureColumnExists(
      "event_settings",
      "default_mission_timer_minutes",
      "INTEGER NOT NULL DEFAULT 5"
    );
    ensureColumnExists("participants", "phone", "TEXT");
    ensureColumnExists("participants", "image_publicity_consent", "INTEGER NOT NULL DEFAULT 0");
    ensureColumnExists("participants", "image_publicity_consent_updated_at", "TEXT");
    ensureColumnExists("participants", "image_publicity_consent_version", "TEXT");
    ensureColumnExists("points_transactions", "created_at_ms", "INTEGER");
    ensureColumnExists("missions", "timer_minutes", "INTEGER");
    ensureColumnExists("missions", "requires_evidence", "INTEGER NOT NULL DEFAULT 0");
    ensureColumnExists("missions", "evidence_type", "TEXT");
    ensureColumnExists("mission_completions", "evidence_file_name", "TEXT");
    ensureColumnExists("mission_completions", "evidence_stored_name", "TEXT");
    ensureColumnExists("mission_completions", "evidence_mime_type", "TEXT");
    ensureColumnExists("mission_completions", "evidence_size_bytes", "INTEGER");
    ensureColumnExists("mission_completions", "evidence_sha256", "TEXT");
    ensureColumnExists("mission_completions", "evidence_duration_seconds", "INTEGER");
    ensureColumnExists("mission_completions", "rejection_reason", "TEXT");
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_mission_completions_sha256
      ON mission_completions(evidence_sha256)
      WHERE evidence_sha256 IS NOT NULL;
    `);
    const legacyActiveDuplicate = db.prepare(
      `SELECT participant_id, mission_id, COUNT(*) as total
         FROM mission_completions
         WHERE status IN ('Pendente', 'Aprovada')
         GROUP BY participant_id, mission_id
         HAVING total > 1
         LIMIT 1`
    ).get();
    if (!legacyActiveDuplicate) {
      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_mission_completions_active_unique
        ON mission_completions(participant_id, mission_id)
        WHERE status IN ('Pendente', 'Aprovada');
      `);
    }
    ensureColumnExists("participant_missions", "duration_seconds", "INTEGER");
    ensureColumnExists("participant_missions", "target_end_at_ms", "INTEGER");
    ensureColumnExists("participant_missions", "submitted_at_ms", "INTEGER");
    db.prepare("UPDATE participants SET points = ? WHERE points > ?").run(
      MAX_PARTICIPANT_POINTS,
      MAX_PARTICIPANT_POINTS
    );
    const existingParticipants = db.prepare("SELECT id FROM participants WHERE UPPER(role) = 'PARTICIPANT'").all();
    for (const p of existingParticipants) {
      ensureParticipantFirstMissionUnlockedInDb(p.id);
    }
    reconcileLegacyFirstMissionUnlockPointsInDb();
    recalculateRankingsInDb();
    db.exec("COMMIT;");
    ensureDailyRankingSchema(db);
    ensureDailyRankingsClosedUpTo(db);
    ensureEvidenceStorageDir();
  } catch (err) {
    db.exec("ROLLBACK;");
    console.error("[SQLite] Erro ao verificar inicializa\xE7\xE3o do banco:", err);
    throw err;
  }
}
function mapParticipantRow(row) {
  const rawRole = String(row.role || "PARTICIPANT").toUpperCase();
  const role = rawRole === "ADMIN" ? "ADMIN" : "PARTICIPANT";
  return {
    id: String(row.id),
    name: String(row.name),
    nickname: String(row.nickname),
    email: String(row.email),
    phone: row.phone ? String(row.phone) : null,
    role,
    avatar: String(row.avatar),
    points: Number(row.points),
    rankingPosition: Number(row.ranking_position),
    completedMissionsCount: Number(row.completed_missions_count),
    visitedStartupsIds: JSON.parse(String(row.visited_startups_json || "[]")),
    registeredAt: String(row.registered_at),
    status: row.status,
    privacyPreferences: {
      showNicknameInPublicRanking: Boolean(row.show_nickname_in_public_ranking),
      allowActivityNotifications: Boolean(row.allow_activity_notifications),
      shareStartupInterests: Boolean(row.share_startup_interests)
    },
    imagePublicityConsent: Boolean(row.image_publicity_consent),
    imagePublicityConsentUpdatedAt: row.image_publicity_consent_updated_at ? String(row.image_publicity_consent_updated_at) : null,
    imagePublicityConsentVersion: row.image_publicity_consent_version ? String(row.image_publicity_consent_version) : null
  };
}
function mapStartupRow(row) {
  return {
    id: String(row.id),
    name: String(row.name),
    shortName: String(row.short_name),
    tagline: String(row.tagline),
    description: String(row.description),
    category: String(row.category),
    solutionPresentation: String(row.solution_presentation),
    boothNumber: String(row.booth_number),
    logoText: String(row.logo_text),
    availablePoints: Number(row.available_points),
    active: Boolean(row.active),
    isConfigurableGuest: Boolean(row.is_configurable_guest),
    website: row.website ? String(row.website) : void 0,
    instagramUrl: row.instagram_url ? String(row.instagram_url) : void 0,
    logoPath: row.logo_path ? String(row.logo_path) : void 0
  };
}
function mapMissionRow(row) {
  const validEvidenceTypes = /* @__PURE__ */ new Set([
    "photo",
    "print",
    "video",
    "photo_or_video",
    "text",
    "file",
    "both"
  ]);
  const rawEvType = row.evidence_type ? String(row.evidence_type) : "";
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description),
    startupId: String(row.startup_id),
    startupName: String(row.startup_name),
    category: row.category,
    points: Number(row.points),
    estimatedTime: String(row.estimated_time),
    status: row.status,
    period: String(row.period),
    completionCriteria: String(row.completion_criteria),
    active: Boolean(row.active),
    qrCodeRequired: row.qr_code_required ? String(row.qr_code_required) : void 0,
    quizQuestions: row.quiz_questions_json ? JSON.parse(String(row.quiz_questions_json)) : void 0,
    timerMinutes: row.timer_minutes !== null && row.timer_minutes !== void 0 ? Number(row.timer_minutes) : null,
    sequenceOrder: row.sequence_order !== null && row.sequence_order !== void 0 ? Number(row.sequence_order) : void 0,
    trackId: row.track_id ? String(row.track_id) : null,
    relativeWeight: row.relative_weight !== null && row.relative_weight !== void 0 ? Number(row.relative_weight) : 10,
    unlockPoints: row.unlock_points !== null && row.unlock_points !== void 0 ? Number(row.unlock_points) : void 0,
    completionPoints: row.completion_points !== null && row.completion_points !== void 0 ? Number(row.completion_points) : void 0,
    maxSpeedBonus: row.max_speed_bonus !== null && row.max_speed_bonus !== void 0 ? Number(row.max_speed_bonus) : void 0,
    requiresEvidence: Boolean(row.requires_evidence),
    evidenceType: validEvidenceTypes.has(rawEvType) ? rawEvType : void 0,
    maxVideoSeconds: row.max_video_seconds !== null && row.max_video_seconds !== void 0 ? Number(row.max_video_seconds) : null,
    allowSharedEvidence: Boolean(row.allow_shared_evidence),
    externalLink: row.external_link ? String(row.external_link) : void 0
  };
}
function mapQRCodeRow(row) {
  return {
    id: String(row.id),
    code: String(row.code),
    label: String(row.label),
    startupId: String(row.startup_id),
    startupName: String(row.startup_name),
    missionId: String(row.mission_id),
    missionTitle: String(row.mission_title),
    points: Number(row.points),
    scansCount: Number(row.scans_count),
    active: Boolean(row.active),
    createdAt: String(row.created_at)
  };
}
function mapValidationRow(row) {
  return {
    id: String(row.id),
    participantId: String(row.participant_id),
    participantName: String(row.participant_name),
    missionId: String(row.mission_id),
    missionTitle: String(row.mission_title),
    startupId: String(row.startup_id),
    startupName: String(row.startup_name),
    submittedAt: String(row.submitted_at),
    evidenceDescription: String(row.evidence_description),
    evidenceCode: String(row.evidence_code),
    evidenceFileName: row.evidence_file_name ? String(row.evidence_file_name) : void 0,
    evidenceMimeType: row.evidence_mime_type ? String(row.evidence_mime_type) : void 0,
    evidenceSizeBytes: row.evidence_size_bytes !== null && row.evidence_size_bytes !== void 0 ? Number(row.evidence_size_bytes) : void 0,
    evidenceDurationSeconds: row.evidence_duration_seconds !== null && row.evidence_duration_seconds !== void 0 ? Number(row.evidence_duration_seconds) : null,
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : null,
    hasFile: Boolean(row.evidence_stored_name),
    pointsAwarded: Number(row.points_awarded),
    status: row.status
  };
}
function mapTransactionRow(row) {
  return {
    id: String(row.id),
    participantId: String(row.participant_id),
    participantName: String(row.participant_name),
    sourceType: row.source_type,
    sourceTitle: String(row.source_title),
    pointsDelta: Number(row.points_delta),
    previousBalance: Number(row.previous_balance),
    newBalance: Number(row.new_balance),
    createdAt: String(row.created_at)
  };
}
function mapEventSettingsRow(row) {
  return {
    eventName: String(row.event_name),
    editionYear: Number(row.edition_year),
    dates: String(row.dates),
    location: String(row.location),
    city: String(row.city),
    description: String(row.description),
    activePeriod: String(row.active_period),
    scoringRules: JSON.parse(String(row.scoring_rules_json || "[]")),
    tieBreakerCriteria: JSON.parse(String(row.tie_breaker_criteria_json || "[]")),
    rewardsEnabled: Boolean(row.rewards_enabled),
    rewardsLegalNote: String(row.rewards_legal_note),
    rewardsDescription: String(row.rewards_description),
    defaultMissionTimerMinutes: Number(row.default_mission_timer_minutes || 5)
  };
}
function mapGovernancePlanRow(row) {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    objective: String(row.objective),
    description: String(row.description),
    responsible: String(row.responsible),
    indicators: String(row.indicators),
    status: row.status,
    relatedDocuments: JSON.parse(String(row.related_documents_json || "[]"))
  };
}
function recalculateRankingsInDb() {
  const rows = db.prepare(
    "SELECT id FROM participants WHERE UPPER(role) = 'PARTICIPANT' ORDER BY points DESC, completed_missions_count DESC, registered_at ASC"
  ).all();
  const updateRank = db.prepare("UPDATE participants SET ranking_position = ? WHERE id = ?");
  rows.forEach((r, idx) => {
    updateRank.run(idx + 1, r.id);
  });
}
function getPublicRankingFromDb(currentUserId) {
  recalculateRankingsInDb();
  const rows = db.prepare(
    "SELECT * FROM participants WHERE status = 'Ativo' AND UPPER(role) = 'PARTICIPANT' ORDER BY ranking_position ASC"
  ).all();
  return rows.map((row) => {
    const p = mapParticipantRow(row);
    const isCurrentUser = Boolean(currentUserId && p.id === currentUserId);
    return {
      position: p.rankingPosition,
      participantId: p.id,
      displayName: p.privacyPreferences.showNicknameInPublicRanking ? p.nickname : p.name,
      avatar: p.avatar,
      points: p.points,
      completedMissionsCount: p.completedMissionsCount,
      isCurrentUser
    };
  });
}
var OFFICIAL_EVENT_DAYS = [
  { date: "2026-11-24", label: "Dia 1 \u2014 24/11 (Ter)" },
  { date: "2026-11-25", label: "Dia 2 \u2014 25/11 (Qua)" },
  { date: "2026-11-26", label: "Dia 3 \u2014 26/11 (Qui)" }
];
var BRASILIA_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});
function formatMsToBrasiliaDate(ms) {
  if (!Number.isFinite(ms)) return null;
  return BRASILIA_DATE_FORMATTER.format(new Date(ms));
}
function parseStoredDateToBrasiliaIso(raw) {
  if (!raw) return null;
  const text = String(raw).trim();
  if (!text) return null;
  const brMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const [, dd, mm, yyyy] = brMatch;
    return `${yyyy}-${mm}-${dd}`;
  }
  if (/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(text)) {
    const parsedMs = Date.parse(text);
    return Number.isNaN(parsedMs) ? null : formatMsToBrasiliaDate(parsedMs);
  }
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch;
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}
function getAdminMetricsFromDb(targetDb = db, nowMs = Date.now()) {
  const allParticipantRows = targetDb.prepare("SELECT * FROM participants WHERE UPPER(role) = 'PARTICIPANT'").all().map(mapParticipantRow);
  const participantIdSet = new Set(allParticipantRows.map((p) => p.id));
  const totalParticipants = allParticipantRows.length;
  const completedMissions = allParticipantRows.reduce(
    (acc, p) => acc + Number(p.completedMissionsCount || 0),
    0
  );
  const totalPointsDistributed = allParticipantRows.reduce(
    (acc, p) => acc + Number(p.points || 0),
    0
  );
  const qrCodesScanned = targetDb.prepare("SELECT COALESCE(SUM(scans_count), 0) as total FROM qr_codes").get().total;
  const registeredStartups = targetDb.prepare("SELECT COUNT(*) as total FROM startups").get().total;
  const missionsRows = targetDb.prepare("SELECT id, title, startup_id, startup_name, track_id, category, points, active FROM missions").all();
  const missionById = new Map(missionsRows.map((m) => [m.id, m]));
  const pmRows = targetDb.prepare(`
      SELECT pm.*
      FROM participant_missions pm
      INNER JOIN participants p ON p.id = pm.participant_id
      WHERE UPPER(p.role) = 'PARTICIPANT'
    `).all();
  const qrScanRows = targetDb.prepare(`
      SELECT qs.participant_id, qs.scanned_at, q.startup_id
      FROM qr_scans qs
      INNER JOIN participants p ON p.id = qs.participant_id
      LEFT JOIN qr_codes q ON q.id = qs.qr_code_id
      WHERE UPPER(p.role) = 'PARTICIPANT'
    `).all();
  const completionRows = targetDb.prepare(`
      SELECT mc.participant_id, mc.startup_id, mc.submitted_at
      FROM mission_completions mc
      INNER JOIN participants p ON p.id = mc.participant_id
      WHERE UPPER(p.role) = 'PARTICIPANT'
    `).all();
  const txRows = targetDb.prepare(`
      SELECT pt.id, pt.participant_id, pt.source_type, pt.points_delta, pt.created_at, pt.event_key, pt.mission_id
      FROM points_transactions pt
      INNER JOIN participants p ON p.id = pt.participant_id
      WHERE UPPER(p.role) = 'PARTICIPANT'
    `).all();
  const legacyReversalKeys = /* @__PURE__ */ new Set();
  const simulationReversedTxIds = /* @__PURE__ */ new Set();
  for (const tx of txRows) {
    if (!tx.event_key) continue;
    if (tx.event_key.startsWith("REVERSAL:")) {
      legacyReversalKeys.add(tx.event_key);
    } else if (tx.event_key.startsWith("REVERSAL_SIMULATION:")) {
      const parts = tx.event_key.split(":");
      if (parts.length >= 3) {
        simulationReversedTxIds.add(parts.slice(2).join(":"));
      }
    }
  }
  const isEffectivePositiveCredit = (tx) => {
    if (Number(tx.points_delta) <= 0) return false;
    if (tx.event_key?.startsWith("REVERSAL")) return false;
    if (simulationReversedTxIds.has(tx.id)) return false;
    if (tx.event_key && tx.event_key.startsWith("UNLOCK:")) {
      const suffix = tx.event_key.slice("UNLOCK:".length);
      if (legacyReversalKeys.has(`REVERSAL:${suffix}`)) return false;
    }
    return true;
  };
  const isMissionExpired = (pm) => {
    if (pm.status === "Bloqueada") return false;
    if (pm.target_end_at_ms === null || pm.target_end_at_ms === void 0) return false;
    const targetEnd = Number(pm.target_end_at_ms);
    if (pm.completed_at_ms !== null && pm.completed_at_ms !== void 0) {
      return Number(pm.completed_at_ms) > targetEnd;
    }
    return pm.status !== "Conclu\xEDda" && nowMs > targetEnd;
  };
  const activeParticipantIds = /* @__PURE__ */ new Set();
  for (const p of allParticipantRows) {
    if (Number(p.points || 0) > 0 || Number(p.completedMissionsCount || 0) > 0) {
      activeParticipantIds.add(p.id);
    }
  }
  for (const pm of pmRows) {
    if (pm.started_at_ms !== null || pm.status === "Conclu\xEDda") {
      activeParticipantIds.add(pm.participant_id);
    }
  }
  for (const scan of qrScanRows) {
    if (participantIdSet.has(scan.participant_id)) {
      activeParticipantIds.add(scan.participant_id);
    }
  }
  for (const comp of completionRows) {
    if (participantIdSet.has(comp.participant_id)) {
      activeParticipantIds.add(comp.participant_id);
    }
  }
  const activeParticipants = activeParticipantIds.size;
  const inactiveParticipants = Math.max(0, totalParticipants - activeParticipants);
  const participationRate = totalParticipants > 0 ? Number((activeParticipants / totalParticipants * 100).toFixed(1)) : 0;
  let startedMissions = 0;
  let completedOfficialMissions = 0;
  let expiredMissions = 0;
  let elapsedSum = 0;
  let elapsedCount = 0;
  let totalSpeedBonusAwarded = 0;
  for (const pm of pmRows) {
    if (pm.started_at_ms !== null) {
      startedMissions += 1;
    }
    if (pm.status === "Conclu\xEDda") {
      completedOfficialMissions += 1;
      if (pm.elapsed_seconds !== null && Number(pm.elapsed_seconds) > 0) {
        elapsedSum += Number(pm.elapsed_seconds);
        elapsedCount += 1;
      }
    }
    if (isMissionExpired(pm)) {
      expiredMissions += 1;
    }
    totalSpeedBonusAwarded += Number(pm.speed_bonus_awarded || 0);
  }
  const missionCompletionRate = startedMissions > 0 ? Number((completedOfficialMissions / startedMissions * 100).toFixed(1)) : 0;
  const averageCompletionSeconds = elapsedCount > 0 ? Math.round(elapsedSum / elapsedCount) : null;
  const startupsRows = targetDb.prepare("SELECT id, name FROM startups WHERE active = 1 ORDER BY rowid ASC").all();
  const participationByStartup = startupsRows.map((st) => {
    const startupMissionIds = new Set(
      missionsRows.filter((m) => m.startup_id === st.id && m.track_id !== "bonus").map((m) => m.id)
    );
    const startupParticipants = /* @__PURE__ */ new Set();
    for (const p of allParticipantRows) {
      if (p.visitedStartupsIds.includes(st.id)) {
        startupParticipants.add(p.id);
      }
    }
    let stStarted = 0;
    let stCompleted = 0;
    let stPending = 0;
    for (const pm of pmRows) {
      if (!startupMissionIds.has(pm.mission_id)) continue;
      if (pm.started_at_ms !== null || pm.status === "Conclu\xEDda") {
        startupParticipants.add(pm.participant_id);
      }
      if (pm.started_at_ms !== null) {
        stStarted += 1;
      }
      if (pm.status === "Conclu\xEDda") {
        stCompleted += 1;
      } else if (pm.status === "Em andamento" || pm.status === "Aguardando valida\xE7\xE3o") {
        stPending += 1;
      }
    }
    for (const scan of qrScanRows) {
      if (scan.startup_id === st.id) {
        startupParticipants.add(scan.participant_id);
      }
    }
    for (const comp of completionRows) {
      if (comp.startup_id === st.id) {
        startupParticipants.add(comp.participant_id);
      }
    }
    let stPointsIssued = 0;
    for (const tx of txRows) {
      if (!tx.mission_id || !startupMissionIds.has(tx.mission_id)) continue;
      if (isEffectivePositiveCredit(tx)) {
        stPointsIssued += Number(tx.points_delta);
      }
    }
    const stCompletionRate = stStarted > 0 ? Number((stCompleted / stStarted * 100).toFixed(1)) : 0;
    return {
      startupId: st.id,
      startupName: st.name,
      visits: startupParticipants.size,
      uniqueParticipants: startupParticipants.size,
      missionsStarted: stStarted,
      missionsCompleted: stCompleted,
      missionsPending: stPending,
      completionRate: stCompletionRate,
      pointsIssued: stPointsIssued
    };
  });
  const dayBuckets = /* @__PURE__ */ new Map();
  for (const d of OFFICIAL_EVENT_DAYS) {
    dayBuckets.set(d.date, {
      date: d.date,
      day: d.label,
      scans: 0,
      missionsStarted: 0,
      missionsCompleted: 0,
      missionsExpired: 0,
      pointsAwarded: 0,
      activeUserIds: /* @__PURE__ */ new Set()
    });
  }
  for (const pm of pmRows) {
    if (pm.started_at_ms !== null) {
      const startDate = formatMsToBrasiliaDate(Number(pm.started_at_ms));
      const bucket = startDate ? dayBuckets.get(startDate) : void 0;
      if (bucket) {
        bucket.missionsStarted += 1;
        bucket.activeUserIds.add(pm.participant_id);
      }
    }
    if (pm.status === "Conclu\xEDda" && pm.completed_at_ms !== null) {
      const compDate = formatMsToBrasiliaDate(Number(pm.completed_at_ms));
      const bucket = compDate ? dayBuckets.get(compDate) : void 0;
      if (bucket) {
        bucket.missionsCompleted += 1;
        bucket.activeUserIds.add(pm.participant_id);
      }
    }
    if (isMissionExpired(pm) && pm.target_end_at_ms !== null) {
      const expDate = formatMsToBrasiliaDate(Number(pm.target_end_at_ms));
      const bucket = expDate ? dayBuckets.get(expDate) : void 0;
      if (bucket) {
        bucket.missionsExpired += 1;
      }
    }
  }
  for (const scan of qrScanRows) {
    const scanDate = parseStoredDateToBrasiliaIso(scan.scanned_at);
    const bucket = scanDate ? dayBuckets.get(scanDate) : void 0;
    if (bucket) {
      bucket.scans += 1;
      bucket.activeUserIds.add(scan.participant_id);
    }
  }
  for (const comp of completionRows) {
    const subDate = parseStoredDateToBrasiliaIso(comp.submitted_at);
    const bucket = subDate ? dayBuckets.get(subDate) : void 0;
    if (bucket) {
      bucket.activeUserIds.add(comp.participant_id);
    }
  }
  for (const tx of txRows) {
    if (!isEffectivePositiveCredit(tx)) continue;
    const txDate = parseStoredDateToBrasiliaIso(tx.created_at);
    const bucket = txDate ? dayBuckets.get(txDate) : void 0;
    if (bucket) {
      bucket.pointsAwarded += Number(tx.points_delta);
      bucket.activeUserIds.add(tx.participant_id);
    }
  }
  const engagementByDay = OFFICIAL_EVENT_DAYS.map((d) => {
    const b = dayBuckets.get(d.date);
    const completionRate = b.missionsStarted > 0 ? Number((b.missionsCompleted / b.missionsStarted * 100).toFixed(1)) : 0;
    return {
      date: b.date,
      day: b.day,
      scans: b.scans,
      missions: b.missionsCompleted,
      missionsStarted: b.missionsStarted,
      missionsCompleted: b.missionsCompleted,
      missionsExpired: b.missionsExpired,
      completionRate,
      pointsAwarded: b.pointsAwarded,
      activeUsers: b.activeUserIds.size
    };
  });
  const missionStatsMap = /* @__PURE__ */ new Map();
  for (const pm of pmRows) {
    const current = missionStatsMap.get(pm.mission_id) || { starts: 0, completions: 0 };
    if (pm.started_at_ms !== null) current.starts += 1;
    if (pm.status === "Conclu\xEDda") current.completions += 1;
    missionStatsMap.set(pm.mission_id, current);
  }
  const missionPerformance = missionsRows.filter((m) => Boolean(m.active)).map((m) => {
    const stats = missionStatsMap.get(m.id) || { starts: 0, completions: 0 };
    return {
      missionId: m.id,
      title: m.title,
      startupName: m.startup_name,
      category: m.category,
      points: Number(m.points),
      starts: stats.starts,
      completions: stats.completions
    };
  }).sort((a, b) => b.completions - a.completions || b.starts - a.starts || a.title.localeCompare(b.title));
  return {
    registeredParticipants: totalParticipants,
    activeParticipants,
    inactiveParticipants,
    startedMissions,
    completedMissions,
    expiredMissions,
    missionCompletionRate,
    averageCompletionSeconds,
    totalSpeedBonusAwarded,
    qrCodesScanned,
    registeredStartups,
    totalPointsDistributed,
    participationRate,
    engagementByDay,
    participationByStartup,
    missionPerformance
  };
}

// server/security/rateLimiter.ts
function resolveClientIp(req) {
  const trustProxy = process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1";
  if (trustProxy) {
    const xff = req.headers["x-forwarded-for"];
    const raw = Array.isArray(xff) ? xff[0] : xff;
    if (typeof raw === "string" && raw.trim().length > 0) {
      const firstIp = raw.split(",")[0].trim();
      if (firstIp) return firstIp;
    }
  }
  return req.socket?.remoteAddress || req.ip || "unknown";
}
function createInMemoryRateLimiter(options) {
  const buckets = /* @__PURE__ */ new Map();
  const cleanupIntervalMs = Math.max(1e3, Math.min(options.windowMs, 6e4));
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (now >= bucket.resetAt) {
        buckets.delete(key);
      }
    }
  }, cleanupIntervalMs);
  cleanupTimer.unref();
  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    const clientIp = resolveClientIp(req);
    const key = `${options.routeKey}:${clientIp}`;
    const existing = buckets.get(key);
    if (!existing || now >= existing.resetAt) {
      buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs
      });
      next();
      return;
    }
    existing.count += 1;
    if (existing.count > options.maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1e3));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        error: options.message || "Muitas tentativas em sequ\xEAncia. Aguarde alguns instantes e tente novamente.",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfterSeconds
      });
      return;
    }
    next();
  };
}

// server/index.ts
initializeDatabase();
var app = express();
var PORT = Number(process.env.PORT) || 3002;
var isShuttingDown = false;
if (process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}
app.use((_req, res, next) => {
  if (isShuttingDown) {
    res.setHeader("Connection", "close");
    res.status(503).json({
      error: "Servidor em processo de encerramento controlado. Tente novamente em instantes.",
      code: "SERVER_SHUTTING_DOWN"
    });
    return;
  }
  next();
});
var configuredCorsOrigins = (process.env.CORS_ALLOWED_ORIGINS || "").split(",").map((o) => o.trim().replace(/\/+$/, "")).filter(Boolean);
var defaultDevOrigins = process.env.NODE_ENV === "production" ? [] : [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173"
];
var allowedCorsOrigins = new Set(
  configuredCorsOrigins.length > 0 ? configuredCorsOrigins : defaultDevOrigins
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const normalizedOrigin = origin.trim().replace(/\/+$/, "");
      if (allowedCorsOrigins.has(normalizedOrigin)) {
        callback(null, true);
        return;
      }
      const corsError = new Error("Origem n\xE3o autorizada pela pol\xEDtica de CORS.");
      corsError.status = 403;
      corsError.code = "CORS_ORIGIN_FORBIDDEN";
      callback(corsError);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Mission-Id",
      "X-File-Name",
      "X-File-Mime",
      "X-Evidence-Description",
      "X-Participant-Id"
    ]
  })
);
app.use(express.json());
var DEFAULT_RATE_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1e3;
var loginRateLimiter = createInMemoryRateLimiter({
  routeKey: "auth_login",
  windowMs: DEFAULT_RATE_WINDOW_MS,
  maxRequests: Number(process.env.RATE_LIMIT_LOGIN_MAX) || 10,
  message: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente."
});
var adminLoginRateLimiter = createInMemoryRateLimiter({
  routeKey: "auth_admin_login",
  windowMs: DEFAULT_RATE_WINDOW_MS,
  maxRequests: Number(process.env.RATE_LIMIT_ADMIN_LOGIN_MAX) || 5,
  message: "Muitas tentativas de login administrativo. Aguarde alguns minutos e tente novamente."
});
var registerRateLimiter = createInMemoryRateLimiter({
  routeKey: "auth_register",
  windowMs: DEFAULT_RATE_WINDOW_MS,
  maxRequests: Number(process.env.RATE_LIMIT_REGISTER_MAX) || 10,
  message: "Muitas tentativas de cadastro em sequ\xEAncia. Aguarde alguns minutos e tente novamente."
});
var evidenceUploadRateLimiter = createInMemoryRateLimiter({
  routeKey: "evidences_upload",
  windowMs: DEFAULT_RATE_WINDOW_MS,
  maxRequests: Number(process.env.RATE_LIMIT_UPLOAD_MAX) || 20,
  message: "Limite tempor\xE1rio de envios de evid\xEAncia atingido. Aguarde alguns minutos."
});
function getAuthenticatedUserById(userId) {
  const row = db.prepare("SELECT * FROM participants WHERE id = ? LIMIT 1").get(userId);
  return row ? mapParticipantRow(row) : null;
}
function hasAdminAccountInDb() {
  const row = db.prepare("SELECT COUNT(*) as total FROM participants WHERE UPPER(role) = 'ADMIN'").get();
  return row.total > 0;
}
function creditPointsInSql(params) {
  const row = db.prepare("SELECT * FROM participants WHERE id = ?").get(params.participantId);
  if (!row) return null;
  const participant = mapParticipantRow(row);
  if (params.eventKey) {
    const existingTx = db.prepare("SELECT id FROM points_transactions WHERE event_key = ? LIMIT 1").get(params.eventKey);
    if (existingTx) {
      return {
        participant,
        effectiveDelta: 0,
        alreadyProcessed: true
      };
    }
  }
  const previousBalance = Math.max(0, Math.min(MAX_PARTICIPANT_POINTS, participant.points));
  let effectiveDelta = 0;
  if (params.pointsDelta >= 0) {
    const remainingCap = Math.max(0, MAX_PARTICIPANT_POINTS - previousBalance);
    effectiveDelta = Math.min(params.pointsDelta, remainingCap);
  } else {
    effectiveDelta = Math.max(params.pointsDelta, -previousBalance);
  }
  const newBalance = previousBalance + effectiveDelta;
  const newMissionCount = params.incrementMissionCount ? participant.completedMissionsCount + 1 : participant.completedMissionsCount;
  const visitedStartups = params.visitedStartupId && !participant.visitedStartupsIds.includes(params.visitedStartupId) ? [...participant.visitedStartupsIds, params.visitedStartupId] : participant.visitedStartupsIds;
  const nowStr = (/* @__PURE__ */ new Date()).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  db.prepare(`
    UPDATE participants
    SET points = ?,
        completed_missions_count = ?,
        visited_startups_json = ?
    WHERE id = ?
  `).run(
    newBalance,
    newMissionCount,
    JSON.stringify(visitedStartups),
    participant.id
  );
  const nowMs = Date.now();
  const txId = `tx-${nowMs}-${Math.random().toString(36).slice(2, 7)}`;
  db.prepare(`
    INSERT INTO points_transactions (
      id, participant_id, participant_name, source_type, source_title,
      points_delta, previous_balance, new_balance, created_at, created_at_ms, event_key, mission_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    txId,
    participant.id,
    participant.name,
    params.sourceType,
    params.sourceTitle,
    effectiveDelta,
    previousBalance,
    newBalance,
    nowStr,
    nowMs,
    params.eventKey || null,
    params.missionId || null
  );
  recalculateRankingsInDb();
  const updatedRow = db.prepare("SELECT * FROM participants WHERE id = ?").get(participant.id);
  return {
    participant: mapParticipantRow(updatedRow),
    effectiveDelta,
    alreadyProcessed: false
  };
}
function getParticipantMissionsFromDb(participant) {
  if (participant.role === "PARTICIPANT") {
    ensureParticipantFirstMissionUnlockedInDb(participant.id);
  }
  const baseMissionsRows = db.prepare(
    "SELECT * FROM missions WHERE sequence_order IS NOT NULL AND active = 1 ORDER BY sequence_order ASC"
  ).all();
  const pmRows = db.prepare(
    "SELECT * FROM participant_missions WHERE participant_id = ? ORDER BY sequence_order ASC"
  ).all(participant.id);
  const pmByMissionId = /* @__PURE__ */ new Map();
  for (const r of pmRows) {
    pmByMissionId.set(String(r.mission_id), r);
  }
  const completedTrackSeqs = /* @__PURE__ */ new Set();
  for (const mRow of baseMissionsRows) {
    const mId = String(mRow.id);
    const trackKey = String(mRow.track_id || "default");
    const seq = Number(mRow.sequence_order);
    const pm = pmByMissionId.get(mId);
    const completeTx = findActiveTransactionByEventKeys(participant.id, [
      `COMPLETE:${participant.id}:${mId}`,
      `COMPLETE:${participant.id}:${mId}:POST_SIM_REV`
    ]);
    if (pm && String(pm.status) === "Conclu\xEDda" || completeTx) {
      completedTrackSeqs.add(`${trackKey}:${seq}`);
    }
  }
  const nowMs = Date.now();
  const officialMapped = baseMissionsRows.map((mRow) => {
    const m = mapMissionRow(mRow);
    const trackKey = String(mRow.track_id || "default");
    const seq = Number(mRow.sequence_order);
    const pm = pmByMissionId.get(m.id);
    const isCompleted = completedTrackSeqs.has(`${trackKey}:${seq}`);
    let computedStatus = "Dispon\xEDvel";
    if (isCompleted) {
      computedStatus = "Conclu\xEDda";
    } else if (seq > 1 && !completedTrackSeqs.has(`${trackKey}:${seq - 1}`)) {
      computedStatus = "Bloqueada";
    } else {
      const pmStatus = pm ? String(pm.status) : "Dispon\xEDvel";
      if (pmStatus === "Aguardando valida\xE7\xE3o") {
        computedStatus = "Aguardando valida\xE7\xE3o";
      } else if (pmStatus === "Em andamento") {
        computedStatus = "Em andamento";
      } else {
        computedStatus = "Dispon\xEDvel";
      }
    }
    const durationSeconds = pm?.duration_seconds ? Number(pm.duration_seconds) : getMissionConfiguredDurationSeconds(m.id);
    const startedAtMs = pm?.started_at_ms ? Number(pm.started_at_ms) : null;
    const submittedAtMs = pm?.submitted_at_ms ? Number(pm.submitted_at_ms) : null;
    const targetEndAtMs = pm?.target_end_at_ms ? Number(pm.target_end_at_ms) : startedAtMs ? startedAtMs + durationSeconds * 1e3 : null;
    const completedAtMs = pm?.completed_at_ms ? Number(pm.completed_at_ms) : null;
    const speedBonusAwarded = Number(pm?.speed_bonus_awarded || 0);
    const rawMaxBonus = Number(mRow.max_speed_bonus);
    const missionMaxBonus = Number.isInteger(rawMaxBonus) && rawMaxBonus >= 0 ? rawMaxBonus : 0;
    let elapsedSeconds = 0;
    let remainingSeconds = durationSeconds;
    let isExpired = false;
    let potentialSpeedBonus = missionMaxBonus;
    if (isCompleted) {
      if (startedAtMs && (submittedAtMs || completedAtMs)) {
        const refEndMs = submittedAtMs ?? completedAtMs;
        elapsedSeconds = Math.max(0, Math.round((refEndMs - startedAtMs) / 1e3));
        remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
      } else {
        elapsedSeconds = Number(pm?.elapsed_seconds || 0);
        remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
      }
      isExpired = remainingSeconds <= 0;
      potentialSpeedBonus = 0;
    } else if (computedStatus === "Aguardando valida\xE7\xE3o" && startedAtMs && submittedAtMs) {
      elapsedSeconds = Math.max(0, Math.round((submittedAtMs - startedAtMs) / 1e3));
      remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
      isExpired = remainingSeconds <= 0;
      potentialSpeedBonus = isExpired ? 0 : Math.max(
        0,
        Math.min(missionMaxBonus, Math.round(missionMaxBonus * (remainingSeconds / durationSeconds)))
      );
    } else if (startedAtMs && targetEndAtMs) {
      elapsedSeconds = Math.max(0, Math.round((nowMs - startedAtMs) / 1e3));
      remainingSeconds = Math.max(0, Math.ceil((targetEndAtMs - nowMs) / 1e3));
      isExpired = remainingSeconds <= 0;
      potentialSpeedBonus = isExpired ? 0 : Math.max(
        0,
        Math.min(missionMaxBonus, Math.round(missionMaxBonus * (remainingSeconds / durationSeconds)))
      );
    }
    return {
      ...m,
      status: computedStatus,
      durationSeconds,
      startedAtMs,
      submittedAtMs,
      targetEndAtMs,
      completedAtMs,
      elapsedSeconds,
      remainingSeconds,
      isExpired,
      potentialSpeedBonus,
      speedBonusAwarded,
      serverTimeMs: nowMs
    };
  });
  const extraEvidenceRows = db.prepare(
    "SELECT * FROM missions WHERE sequence_order IS NULL AND active = 1 AND requires_evidence = 1 ORDER BY rowid ASC"
  ).all();
  const extraMapped = extraEvidenceRows.map((mRow) => {
    const m = mapMissionRow(mRow);
    const pm = pmByMissionId.get(m.id);
    const subRow = db.prepare(
      "SELECT status FROM mission_completions WHERE participant_id = ? AND mission_id = ? ORDER BY rowid DESC LIMIT 1"
    ).get(participant.id, m.id);
    let computedStatus = "Dispon\xEDvel";
    if (pm && String(pm.status) === "Conclu\xEDda" || subRow?.status === "Aprovada") {
      computedStatus = "Conclu\xEDda";
    } else if (subRow?.status === "Pendente") {
      computedStatus = "Aguardando valida\xE7\xE3o";
    }
    return {
      ...m,
      status: computedStatus,
      serverTimeMs: nowMs
    };
  });
  return [...officialMapped, ...extraMapped];
}
function completeSequentialMissionInSql(params) {
  db.exec("BEGIN IMMEDIATE TRANSACTION;");
  try {
    ensureParticipantFirstMissionUnlockedInDb(params.participantId);
    const missionRow = db.prepare("SELECT * FROM missions WHERE id = ? LIMIT 1").get(params.missionId);
    if (!missionRow) {
      db.exec("ROLLBACK;");
      return {
        ok: false,
        httpStatus: 404,
        status: "INVALID_MISSION",
        message: "Miss\xE3o n\xE3o encontrada no banco SQLite."
      };
    }
    const mission = mapMissionRow(missionRow);
    const seqOrder = missionRow.sequence_order !== null && missionRow.sequence_order !== void 0 ? Number(missionRow.sequence_order) : null;
    if (!mission.active || seqOrder === null) {
      db.exec("ROLLBACK;");
      return {
        ok: false,
        httpStatus: 400,
        status: "INVALID_MISSION",
        message: `A miss\xE3o "${mission.title}" n\xE3o faz parte da trilha ativa no momento.`
      };
    }
    const baseCompleteEventKey = `COMPLETE:${params.participantId}:${mission.id}`;
    const completeEventKey = resolveNextIdempotentEventKey(
      params.participantId,
      baseCompleteEventKey
    );
    const existingCompleteTx = findActiveTransactionByEventKeys(params.participantId, [
      baseCompleteEventKey,
      `${baseCompleteEventKey}:POST_SIM_REV`
    ]);
    const pmRow = db.prepare(
      "SELECT * FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1"
    ).get(params.participantId, mission.id);
    if (existingCompleteTx || pmRow && String(pmRow.status) === "Conclu\xEDda") {
      db.exec("ROLLBACK;");
      return {
        ok: false,
        httpStatus: 409,
        status: "ALREADY_USED",
        alreadyUsed: true,
        alreadyCompleted: true,
        message: `A miss\xE3o "${mission.title}" j\xE1 foi conclu\xEDda anteriormente e seus pontos j\xE1 foram creditados.`
      };
    }
    const missionTrackKey = missionRow.track_id ? String(missionRow.track_id) : "default";
    if (seqOrder > 1) {
      const prevMissionRow = db.prepare(
        "SELECT id, title FROM missions WHERE COALESCE(track_id, 'default') = ? AND sequence_order = ? AND active = 1 LIMIT 1"
      ).get(missionTrackKey, seqOrder - 1);
      if (prevMissionRow) {
        const prevCompleteTx = findActiveTransactionByEventKeys(params.participantId, [
          `COMPLETE:${params.participantId}:${prevMissionRow.id}`,
          `COMPLETE:${params.participantId}:${prevMissionRow.id}:POST_SIM_REV`
        ]);
        const prevPm = db.prepare(
          "SELECT status FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1"
        ).get(params.participantId, prevMissionRow.id);
        const isPrevCompleted = Boolean(prevCompleteTx) || prevPm && String(prevPm.status) === "Conclu\xEDda";
        if (!isPrevCompleted) {
          db.exec("ROLLBACK;");
          return {
            ok: false,
            httpStatus: 403,
            status: "MISSION_LOCKED",
            message: `Bloqueio sequencial: conclua primeiro a Miss\xE3o 0${seqOrder - 1} ("${prevMissionRow.title}") antes de realizar a Miss\xE3o 0${seqOrder}.`
          };
        }
      }
    }
    if (params.qrCodeRow) {
      const existingScan = db.prepare(
        "SELECT id FROM qr_scans WHERE qr_code_id = ? AND participant_id = ? LIMIT 1"
      ).get(params.qrCodeRow.id, params.participantId);
      if (existingScan) {
        db.exec("ROLLBACK;");
        return {
          ok: false,
          httpStatus: 409,
          status: "ALREADY_USED",
          alreadyUsed: true,
          alreadyCompleted: true,
          message: `C\xF3digo ${params.qrCodeRow.code} j\xE1 utilizado! Voc\xEA j\xE1 concluiu a miss\xE3o "${mission.title}".`
        };
      }
      db.prepare("UPDATE qr_codes SET scans_count = scans_count + 1 WHERE id = ?").run(
        params.qrCodeRow.id
      );
      db.prepare(
        "INSERT INTO qr_scans (id, qr_code_id, participant_id, scanned_at) VALUES (?, ?, ?, ?)"
      ).run(
        `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        params.qrCodeRow.id,
        params.participantId,
        (/* @__PURE__ */ new Date()).toISOString()
      );
    }
    const nowMs = Date.now();
    const completionSourceTitle = params.qrCodeRow ? `Conclus\xE3o (${params.qrCodeRow.code}): ${mission.title}` : `Conclus\xE3o: ${mission.title}`;
    const rawUnlock = missionRow.unlock_points;
    const rawCompletion = missionRow.completion_points;
    const rawBonus = missionRow.max_speed_bonus;
    if (rawUnlock === null || rawUnlock === void 0 || rawCompletion === null || rawCompletion === void 0 || rawBonus === null || rawBonus === void 0 || !Number.isInteger(Number(rawUnlock)) || Number(rawUnlock) < 0 || !Number.isInteger(Number(rawCompletion)) || Number(rawCompletion) <= 0 || !Number.isInteger(Number(rawBonus)) || Number(rawBonus) < 0) {
      db.exec("ROLLBACK;");
      return {
        ok: false,
        httpStatus: 500,
        status: "INVALID_CIRCUIT_SCORING",
        message: `Erro cont\xE1bil: a miss\xE3o oficial "${mission.title}" (ID: ${mission.id}) n\xE3o possui valores din\xE2micos v\xE1lidos de pontua\xE7\xE3o no banco (unlock: ${missionRow.unlock_points}, completion: ${missionRow.completion_points}, bonus: ${missionRow.max_speed_bonus}). Opera\xE7\xE3o abortada e revertida integralmente.`
      };
    }
    const missionUnlockPoints = Number(rawUnlock);
    const missionCompletionPoints = Number(rawCompletion);
    const missionMaxSpeedBonus = Number(rawBonus);
    const startedAtMs = pmRow?.started_at_ms ? Number(pmRow.started_at_ms) : null;
    const submittedAtMs = pmRow?.submitted_at_ms ? Number(pmRow.submitted_at_ms) : null;
    const durationSeconds = pmRow?.duration_seconds ? Number(pmRow.duration_seconds) : getMissionConfiguredDurationSeconds(mission.id);
    let elapsedSeconds = 0;
    let speedBonus = 0;
    if (startedAtMs) {
      const effectiveEndMs = submittedAtMs ?? nowMs;
      elapsedSeconds = Math.max(0, Math.round((effectiveEndMs - startedAtMs) / 1e3));
      const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
      if (remainingSeconds > 0 && durationSeconds > 0) {
        speedBonus = Math.round(missionMaxSpeedBonus * (remainingSeconds / durationSeconds));
        speedBonus = Math.max(0, Math.min(missionMaxSpeedBonus, speedBonus));
      }
    }
    let awardedUnlockPoints = 0;
    if (seqOrder === 1) {
      const legacyUnlockTx = findActiveTransactionByEventKeys(params.participantId, [
        `UNLOCK:${params.participantId}:${mission.id}`,
        `UNLOCK:${params.participantId}:${mission.id}:POST_SIM_REV`
      ]);
      const reversalTx = db.prepare("SELECT id FROM points_transactions WHERE event_key = ? LIMIT 1").get(`REVERSAL:${params.participantId}:${mission.id}`);
      const validatedUnlockTx = findActiveTransactionByEventKeys(params.participantId, [
        `UNLOCK_VALIDATED:${params.participantId}:${mission.id}`,
        `UNLOCK_VALIDATED:${params.participantId}:${mission.id}:POST_SIM_REV`
      ]);
      const hasEffectiveUnlock = Boolean(legacyUnlockTx) && !Boolean(reversalTx) || Boolean(validatedUnlockTx);
      if (!hasEffectiveUnlock) {
        const baseUnlockKey = Boolean(reversalTx) ? `UNLOCK_VALIDATED:${params.participantId}:${mission.id}` : `UNLOCK:${params.participantId}:${mission.id}`;
        const unlockEventKey = resolveNextIdempotentEventKey(params.participantId, baseUnlockKey);
        const unlockCredit = creditPointsInSql({
          participantId: params.participantId,
          pointsDelta: missionUnlockPoints,
          sourceType: "Miss\xE3o",
          sourceTitle: `Desbloqueio: ${mission.title}`,
          incrementMissionCount: false,
          eventKey: unlockEventKey,
          missionId: mission.id
        });
        awardedUnlockPoints = unlockCredit?.effectiveDelta ?? 0;
      } else {
        awardedUnlockPoints = validatedUnlockTx ? Number(validatedUnlockTx.points_delta) : Number(legacyUnlockTx?.points_delta || missionUnlockPoints);
      }
    } else {
      const existingUnlockTx = findActiveTransactionByEventKeys(params.participantId, [
        `UNLOCK:${params.participantId}:${mission.id}`,
        `UNLOCK:${params.participantId}:${mission.id}:POST_SIM_REV`
      ]);
      awardedUnlockPoints = existingUnlockTx ? Number(existingUnlockTx.points_delta) : Number(pmRow?.unlock_points_awarded || missionUnlockPoints);
    }
    const completionCredit = creditPointsInSql({
      participantId: params.participantId,
      pointsDelta: missionCompletionPoints,
      sourceType: params.sourceType,
      sourceTitle: completionSourceTitle,
      visitedStartupId: mission.startupId,
      incrementMissionCount: true,
      eventKey: completeEventKey,
      missionId: mission.id
    });
    const awardedCompletionPoints = completionCredit?.effectiveDelta ?? 0;
    let awardedSpeedBonus = 0;
    if (speedBonus > 0) {
      const speedBonusEventKey = resolveNextIdempotentEventKey(
        params.participantId,
        `SPEED_BONUS:${params.participantId}:${mission.id}`
      );
      const bonusCredit = creditPointsInSql({
        participantId: params.participantId,
        pointsDelta: speedBonus,
        sourceType: "Miss\xE3o",
        sourceTitle: `B\xF4nus de Velocidade (+${speedBonus} pts): ${mission.title}`,
        incrementMissionCount: false,
        eventKey: speedBonusEventKey,
        missionId: mission.id
      });
      awardedSpeedBonus = bonusCredit?.effectiveDelta ?? 0;
    }
    db.prepare(`
      UPDATE participant_missions
      SET status = 'Conclu\xEDda',
          completed_at_ms = ?,
          elapsed_seconds = ?,
          unlock_points_awarded = ?,
          completion_points_awarded = ?,
          speed_bonus_awarded = ?,
          total_points_awarded = ? + ? + ?
      WHERE participant_id = ? AND mission_id = ?
    `).run(
      nowMs,
      elapsedSeconds,
      awardedUnlockPoints,
      awardedCompletionPoints,
      awardedSpeedBonus,
      awardedUnlockPoints,
      awardedCompletionPoints,
      awardedSpeedBonus,
      params.participantId,
      mission.id
    );
    let nextMissionUnlockedTitle = null;
    let awardedNextUnlockPoints = 0;
    const nextMissionRow = db.prepare(
      "SELECT * FROM missions WHERE COALESCE(track_id, 'default') = ? AND sequence_order = ? AND active = 1 LIMIT 1"
    ).get(missionTrackKey, seqOrder + 1);
    if (nextMissionRow) {
      const nextMissionId = String(nextMissionRow.id);
      const nextMissionTitle = String(nextMissionRow.title);
      const rawNextUnlock = nextMissionRow.unlock_points;
      if (rawNextUnlock === null || rawNextUnlock === void 0 || !Number.isInteger(Number(rawNextUnlock)) || Number(rawNextUnlock) < 0) {
        db.exec("ROLLBACK;");
        return {
          ok: false,
          httpStatus: 500,
          status: "INVALID_CIRCUIT_SCORING",
          message: `Erro cont\xE1bil: a pr\xF3xima miss\xE3o oficial "${nextMissionTitle}" (ID: ${nextMissionId}) n\xE3o possui pontua\xE7\xE3o din\xE2mica de desbloqueio v\xE1lida no banco (unlock: ${nextMissionRow.unlock_points}). Opera\xE7\xE3o abortada e revertida integralmente.`
        };
      }
      const nextUnlockPoints = Number(rawNextUnlock);
      const nextUnlockEventKey = resolveNextIdempotentEventKey(
        params.participantId,
        `UNLOCK:${params.participantId}:${nextMissionId}`
      );
      const unlockCredit = creditPointsInSql({
        participantId: params.participantId,
        pointsDelta: nextUnlockPoints,
        sourceType: "Miss\xE3o",
        sourceTitle: `Desbloqueio: ${nextMissionTitle}`,
        incrementMissionCount: false,
        eventKey: nextUnlockEventKey,
        missionId: nextMissionId
      });
      awardedNextUnlockPoints = unlockCredit?.effectiveDelta ?? 0;
      nextMissionUnlockedTitle = nextMissionTitle;
      db.prepare(`
        INSERT INTO participant_missions (
          id, participant_id, mission_id, sequence_order, status,
          unlocked_at_ms, unlock_points_awarded, completion_points_awarded,
          speed_bonus_awarded, total_points_awarded
        ) VALUES (?, ?, ?, ?, 'Dispon\xEDvel', ?, ?, 0, 0, ?)
        ON CONFLICT(participant_id, mission_id) DO UPDATE SET
          status = CASE WHEN participant_missions.status = 'Conclu\xEDda' THEN 'Conclu\xEDda' ELSE 'Dispon\xEDvel' END,
          unlocked_at_ms = COALESCE(participant_missions.unlocked_at_ms, excluded.unlocked_at_ms),
          unlock_points_awarded = CASE WHEN participant_missions.unlock_points_awarded > 0 THEN participant_missions.unlock_points_awarded ELSE excluded.unlock_points_awarded END,
          total_points_awarded = (CASE WHEN participant_missions.unlock_points_awarded > 0 THEN participant_missions.unlock_points_awarded ELSE excluded.unlock_points_awarded END) + participant_missions.completion_points_awarded + participant_missions.speed_bonus_awarded
      `).run(
        `pm-${params.participantId}-${nextMissionId}`,
        params.participantId,
        nextMissionId,
        seqOrder + 1,
        nowMs,
        awardedNextUnlockPoints,
        awardedNextUnlockPoints
      );
    }
    db.exec("COMMIT;");
    const updatedParticipant = db.prepare("SELECT * FROM participants WHERE id = ?").get(params.participantId);
    const bonusMsg = awardedSpeedBonus > 0 ? ` com B\xF4nus de Velocidade (+${awardedSpeedBonus} pts)! Total na miss\xE3o: ${awardedCompletionPoints + awardedSpeedBonus} pts.` : " (sem b\xF4nus de velocidade adicional).";
    const unlockMsg = nextMissionUnlockedTitle ? ` Pr\xF3xima miss\xE3o "${nextMissionUnlockedTitle}" desbloqueada automaticamente (+${awardedNextUnlockPoints} pts)!` : " Voc\xEA concluiu todas as miss\xF5es principais do circuito!";
    return {
      ok: true,
      httpStatus: 200,
      status: "VALIDATED",
      missionId: mission.id,
      missionTitle: mission.title,
      completionPointsAwarded: awardedCompletionPoints,
      speedBonusAwarded: awardedSpeedBonus,
      unlockPointsAwarded: awardedNextUnlockPoints,
      initialUnlockPointsAwarded: seqOrder === 1 ? awardedUnlockPoints : 0,
      pointsAwarded: (seqOrder === 1 ? awardedUnlockPoints : 0) + awardedCompletionPoints + awardedSpeedBonus + awardedNextUnlockPoints,
      nextMissionUnlocked: nextMissionUnlockedTitle,
      participant: mapParticipantRow(updatedParticipant),
      message: `Miss\xE3o "${mission.title}" conclu\xEDda (+${awardedCompletionPoints} pts)${seqOrder === 1 && awardedUnlockPoints > 0 ? ` +${awardedUnlockPoints} pts de desbloqueio` : ""}${bonusMsg}${unlockMsg}`
    };
  } catch (err) {
    try {
      db.exec("ROLLBACK;");
    } catch {
    }
    const errMsg = String(err?.message || "");
    if (errMsg.includes("UNIQUE constraint failed")) {
      return {
        ok: false,
        httpStatus: 409,
        status: "ALREADY_USED",
        alreadyUsed: true,
        alreadyCompleted: true,
        message: "Esta opera\xE7\xE3o j\xE1 foi registrada anteriormente (prote\xE7\xE3o contra duplicidade)."
      };
    }
    throw err;
  }
}
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    engine: "node:sqlite (SQLite3)",
    rbac: "enabled (PARTICIPANT | ADMIN)",
    hasConfiguredAdmin: hasAdminAccountInDb(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/bootstrap", (req, res) => {
  recalculateRankingsInDb();
  const session = resolveSessionFromRequest(req);
  const isAdmin = session?.role === "ADMIN";
  const isParticipantSession = session?.role === "PARTICIPANT";
  let authenticatedParticipant = null;
  if (session) {
    const bySession = db.prepare("SELECT * FROM participants WHERE id = ? LIMIT 1").get(session.userId);
    if (bySession) {
      authenticatedParticipant = mapParticipantRow(bySession);
    }
  }
  const missions = isAdmin ? db.prepare(
    "SELECT * FROM missions ORDER BY CASE WHEN sequence_order IS NOT NULL THEN 0 ELSE 1 END, sequence_order ASC, rowid ASC"
  ).all().map(mapMissionRow) : authenticatedParticipant && isParticipantSession ? getParticipantMissionsFromDb(authenticatedParticipant) : db.prepare(
    "SELECT * FROM missions WHERE active = 1 ORDER BY CASE WHEN sequence_order IS NOT NULL THEN 0 ELSE 1 END, sequence_order ASC, rowid ASC"
  ).all().map(mapMissionRow);
  if (authenticatedParticipant && isParticipantSession) {
    const refreshed = db.prepare("SELECT * FROM participants WHERE id = ? LIMIT 1").get(authenticatedParticipant.id);
    if (refreshed) {
      authenticatedParticipant = mapParticipantRow(refreshed);
    }
    recalculateRankingsInDb();
  }
  const guestParticipant = {
    id: "",
    name: "",
    nickname: "",
    email: "",
    phone: "",
    role: "PARTICIPANT",
    avatar: "",
    points: 0,
    rankingPosition: 0,
    completedMissionsCount: 0,
    visitedStartupsIds: [],
    registeredAt: "",
    status: "Ativo",
    privacy: {
      showNicknameInPublicRanking: true,
      allowActivityNotifications: false,
      shareStartupInterests: false
    }
  };
  const participant = authenticatedParticipant || guestParticipant;
  const startups = (isAdmin ? db.prepare("SELECT * FROM startups").all() : db.prepare("SELECT * FROM startups WHERE active = 1").all()).map(mapStartupRow);
  const qrCodes = db.prepare("SELECT * FROM qr_codes").all().map(mapQRCodeRow);
  const publicRanking = getPublicRankingFromDb(authenticatedParticipant?.id);
  const dailyRankings = getDailyRankingsFromDb(db, {
    currentUserId: authenticatedParticipant?.id
  });
  const settingsRow = db.prepare("SELECT * FROM event_settings WHERE id = 1").get();
  const eventSettings = mapEventSettingsRow(settingsRow);
  const allParticipants = isAdmin ? db.prepare(
    "SELECT * FROM participants WHERE UPPER(role) = 'PARTICIPANT' ORDER BY ranking_position ASC"
  ).all().map(mapParticipantRow) : [];
  const validationQueue = isAdmin ? getEnrichedAdminValidations() : authenticatedParticipant && isParticipantSession ? db.prepare("SELECT * FROM mission_completions WHERE participant_id = ? ORDER BY rowid DESC").all(authenticatedParticipant.id).map(mapValidationRow) : [];
  const pointsTransactions = isAdmin ? db.prepare("SELECT * FROM points_transactions ORDER BY rowid DESC").all().map(mapTransactionRow) : [];
  const governancePlans = isAdmin ? db.prepare("SELECT * FROM governance_plans ORDER BY code ASC").all().map(mapGovernancePlanRow) : [];
  const adminMetrics = isAdmin ? getAdminMetricsFromDb() : {
    registeredParticipants: publicRanking.length,
    activeParticipants: 0,
    inactiveParticipants: publicRanking.length,
    startedMissions: 0,
    completedMissions: 0,
    expiredMissions: 0,
    missionCompletionRate: 0,
    averageCompletionSeconds: null,
    totalSpeedBonusAwarded: 0,
    qrCodesScanned: 0,
    registeredStartups: startups.length,
    totalPointsDistributed: 0,
    participationRate: 0,
    engagementByDay: [],
    participationByStartup: [],
    missionPerformance: []
  };
  res.json({
    participant,
    allParticipants,
    startups,
    missions,
    qrCodes,
    validationQueue,
    publicRanking,
    dailyRankings,
    pointsTransactions,
    eventSettings,
    governancePlans,
    adminMetrics,
    auth: {
      authenticated: Boolean(session && authenticatedParticipant),
      role: session && authenticatedParticipant ? session.role : null,
      userId: session && authenticatedParticipant ? session.userId : null,
      email: session && authenticatedParticipant ? session.email : null,
      hasConfiguredAdmin: hasAdminAccountInDb()
    }
  });
});
app.get("/api/auth/session", (req, res) => {
  const session = resolveSessionFromRequest(req);
  if (!session) {
    res.status(401).json({
      authenticated: false,
      hasConfiguredAdmin: hasAdminAccountInDb(),
      error: "Sess\xE3o inv\xE1lida, expirada ou n\xE3o autenticada."
    });
    return;
  }
  const userRow = db.prepare("SELECT * FROM participants WHERE id = ?").get(session.userId);
  res.json({
    authenticated: true,
    session,
    user: mapParticipantRow(userRow),
    hasConfiguredAdmin: hasAdminAccountInDb()
  });
});
app.post("/api/auth/login", loginRateLimiter, (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail || !password) {
    res.status(401).json({
      error: "E-mail ou senha inv\xE1lidos.",
      code: "INVALID_CREDENTIALS"
    });
    return;
  }
  const row = db.prepare("SELECT * FROM participants WHERE LOWER(email) = ? LIMIT 1").get(cleanEmail);
  if (!row || String(row.status) === "Inativo") {
    res.status(401).json({
      error: "E-mail ou senha inv\xE1lidos.",
      code: "INVALID_CREDENTIALS"
    });
    return;
  }
  const storedHash = String(row.password_hash || "");
  if (!storedHash || !storedHash.startsWith("scrypt$") || !verifyPassword(password, storedHash)) {
    res.status(401).json({
      error: "E-mail ou senha inv\xE1lidos.",
      code: "INVALID_CREDENTIALS"
    });
    return;
  }
  recalculateRankingsInDb();
  const updatedRow = db.prepare("SELECT * FROM participants WHERE id = ?").get(String(row.id));
  const user = mapParticipantRow(updatedRow);
  const sessionToken = createSessionInDb({
    userId: user.id,
    email: user.email,
    role: user.role || "PARTICIPANT"
  });
  res.json({
    token: sessionToken.token,
    expiresAt: sessionToken.expiresAt,
    user,
    message: `Sess\xE3o autenticada para ${user.name} (${user.role}).`
  });
});
app.post("/api/auth/admin/login", adminLoginRateLimiter, (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail || !password) {
    res.status(400).json({
      error: "Informe o e-mail e a senha administrativa."
    });
    return;
  }
  const row = db.prepare("SELECT * FROM participants WHERE LOWER(email) = ?").get(cleanEmail);
  if (!row) {
    res.status(401).json({
      error: "Credenciais administrativas inv\xE1lidas."
    });
    return;
  }
  const dbRole = String(row.role || "").toUpperCase();
  if (dbRole !== "ADMIN") {
    res.status(403).json({
      error: "Acesso negado (HTTP 403): esta conta possui perfil PARTICIPANT e n\xE3o tem autoriza\xE7\xE3o para acessar o Painel Administrativo.",
      code: "FORBIDDEN_PARTICIPANT_ACCOUNT"
    });
    return;
  }
  const storedHash = String(row.password_hash || "");
  if (!verifyPassword(password, storedHash)) {
    res.status(401).json({
      error: "Credenciais administrativas inv\xE1lidas."
    });
    return;
  }
  const adminUser = mapParticipantRow(row);
  const sessionToken = createSessionInDb({
    userId: adminUser.id,
    email: adminUser.email,
    role: "ADMIN"
  });
  res.json({
    token: sessionToken.token,
    expiresAt: sessionToken.expiresAt,
    user: adminUser,
    message: `Autentica\xE7\xE3o administrativa confirmada para ${adminUser.name}.`
  });
});
app.post("/api/auth/logout", (req, res) => {
  const rawToken = extractBearerToken(req);
  if (rawToken) {
    revokeSessionTokenInDb(rawToken);
  }
  db.prepare("UPDATE participants SET is_current_session = 0").run();
  res.json({
    success: true,
    message: "Sess\xE3o encerrada e token invalidado no servidor."
  });
});
function normalizeAndValidateBrazilianPhone(raw) {
  const rawStr = typeof raw === "string" || typeof raw === "number" ? String(raw) : "";
  let digits = rawStr.replace(/\D/g, "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  if (!digits) {
    return {
      ok: false,
      code: "PHONE_REQUIRED",
      error: "Informe seu telefone ou WhatsApp com DDD."
    };
  }
  if (digits.length !== 10 && digits.length !== 11) {
    return {
      ok: false,
      code: "INVALID_PHONE",
      error: "Informe um telefone brasileiro v\xE1lido com DDD (10 d\xEDgitos para fixo ou 11 para celular)."
    };
  }
  if (/^(\d)\1+$/.test(digits)) {
    return {
      ok: false,
      code: "INVALID_PHONE",
      error: "N\xFAmero de telefone inv\xE1lido."
    };
  }
  if (!VALID_BRAZILIAN_DDDS.has(digits.slice(0, 2))) {
    return {
      ok: false,
      code: "INVALID_PHONE",
      error: "DDD inv\xE1lido. Informe um DDD brasileiro v\xE1lido."
    };
  }
  if (digits.length === 11 && digits[2] !== "9") {
    return {
      ok: false,
      code: "INVALID_PHONE",
      error: "N\xFAmeros de celular com 11 d\xEDgitos devem come\xE7ar com 9 ap\xF3s o DDD."
    };
  }
  if (digits.length === 10 && !/[2-5]/.test(digits[2])) {
    return {
      ok: false,
      code: "INVALID_PHONE",
      error: "N\xFAmero de telefone fixo inv\xE1lido ap\xF3s o DDD."
    };
  }
  return { ok: true, normalized: digits };
}
function registerParticipantInDb(targetDb, payload, hooks) {
  const { name, email, phone, password, role } = payload;
  if (role && String(role).toUpperCase() === "ADMIN") {
    return {
      ok: false,
      httpStatus: 403,
      code: "PRIVILEGE_ESCALATION_BLOCKED",
      error: "Opera\xE7\xE3o bloqueada (HTTP 403): n\xE3o \xE9 permitido atribuir papel ADMIN pelo cadastro de participantes."
    };
  }
  const phoneCheck = normalizeAndValidateBrazilianPhone(phone);
  if (!phoneCheck.ok) {
    return {
      ok: false,
      httpStatus: 400,
      code: phoneCheck.code,
      error: phoneCheck.error
    };
  }
  const normalizedPhone = phoneCheck.normalized;
  const cleanName = (name || "Participante Summit").trim();
  const cleanEmail = (email || `visitante.${Date.now()}@summit2026.br`).trim().toLowerCase();
  const nickname = cleanName.split(/\s+/)[0];
  const initials = cleanName.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const passwordHash = password ? hashPassword(password) : hashPassword(crypto.randomUUID());
  const newId = `part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const nowStr = (/* @__PURE__ */ new Date()).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  targetDb.exec("BEGIN IMMEDIATE TRANSACTION;");
  try {
    const existing = targetDb.prepare("SELECT id FROM participants WHERE LOWER(email) = ? LIMIT 1").get(cleanEmail);
    if (existing) {
      targetDb.exec("ROLLBACK;");
      return {
        ok: false,
        httpStatus: 409,
        code: "EMAIL_ALREADY_REGISTERED",
        error: "Este e-mail j\xE1 possui cadastro. Fa\xE7a login para acessar sua conta."
      };
    }
    targetDb.prepare("UPDATE participants SET is_current_session = 0 WHERE UPPER(role) = 'PARTICIPANT'").run();
    targetDb.prepare(`
        INSERT INTO participants (
          id, name, nickname, email, phone, password_hash, role, avatar, points, ranking_position,
          completed_missions_count, visited_startups_json,
          registered_at, status, show_nickname_in_public_ranking,
          allow_activity_notifications, share_startup_interests, is_current_session
        ) VALUES (?, ?, ?, ?, ?, ?, 'PARTICIPANT', ?, 0, 1, 0, '[]', ?, 'Ativo', 1, 1, 0, 1)
      `).run(newId, cleanName, nickname, cleanEmail, normalizedPhone, passwordHash, initials || "PS", nowStr);
    if (hooks?.onAfterInsert) {
      hooks.onAfterInsert(newId);
    }
    targetDb.exec("COMMIT;");
  } catch (err) {
    try {
      targetDb.exec("ROLLBACK;");
    } catch (_) {
    }
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes("UNIQUE constraint failed") && errMsg.includes("email")) {
      return {
        ok: false,
        httpStatus: 409,
        code: "EMAIL_ALREADY_REGISTERED",
        error: "Este e-mail j\xE1 possui cadastro. Fa\xE7a login para acessar sua conta."
      };
    }
    throw err;
  }
  const createdRow = targetDb.prepare("SELECT * FROM participants WHERE id = ?").get(newId);
  const user = mapParticipantRow(createdRow);
  const sessionToken = hooks?.createSession ? hooks.createSession({
    userId: user.id,
    email: user.email,
    role: "PARTICIPANT"
  }) : void 0;
  return {
    ok: true,
    httpStatus: 201,
    token: sessionToken?.token,
    expiresAt: sessionToken?.expiresAt,
    user,
    message: "Cadastro gravado com sucesso no banco de dados SQLite!"
  };
}
app.post("/api/auth/register", registerRateLimiter, (req, res) => {
  const result = registerParticipantInDb(
    db,
    req.body || {},
    {
      onAfterInsert: (newId) => {
        ensureParticipantFirstMissionUnlockedInDb(newId);
        recalculateRankingsInDb();
      },
      createSession: (params) => createSessionInDb(params)
    }
  );
  if (!result.ok) {
    res.status(result.httpStatus).json({
      error: result.error,
      code: result.code
    });
    return;
  }
  res.status(result.httpStatus).json({
    token: result.token,
    expiresAt: result.expiresAt,
    user: result.user,
    message: result.message
  });
});
app.post("/api/auth/recover-password", (req, res) => {
  const { email } = req.body;
  res.json({
    message: `Instru\xE7\xF5es de redefini\xE7\xE3o registradas para ${email} no servidor Express/SQLite.`
  });
});
app.get("/api/participants", requireAdmin, (_req, res) => {
  recalculateRankingsInDb();
  const rows = db.prepare(
    "SELECT * FROM participants WHERE UPPER(role) = 'PARTICIPANT' ORDER BY ranking_position ASC"
  ).all();
  res.json(rows.map(mapParticipantRow));
});
app.get("/api/participants/me", requireAuth, (req, res) => {
  recalculateRankingsInDb();
  const current = getAuthenticatedUserById(req.authSession.userId);
  if (!current) {
    res.status(401).json({
      error: "Sess\xE3o inv\xE1lida ou usu\xE1rio n\xE3o encontrado.",
      code: "AUTH_REQUIRED"
    });
    return;
  }
  res.json(current);
});
var EMAIL_VALIDATION_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var MIN_PASSWORD_LENGTH = 6;
function computeInitialsFromName(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
function updateParticipantProfileInDb(targetDb, participantId, rawBody, options) {
  if (rawBody.id !== void 0 && String(rawBody.id) !== participantId || rawBody.participantId !== void 0 && String(rawBody.participantId) !== participantId) {
    return {
      ok: false,
      httpStatus: 403,
      code: "FORBIDDEN_OTHER_PARTICIPANT",
      error: "Opera\xE7\xE3o bloqueada (HTTP 403): voc\xEA s\xF3 pode atualizar os seus pr\xF3prios dados cadastrais."
    };
  }
  if (!options?.allowAdminFields && (rawBody.role !== void 0 || rawBody.isAdmin !== void 0 || rawBody.permissions !== void 0 || rawBody.points !== void 0 || rawBody.completedMissionsCount !== void 0 || rawBody.completed_missions_count !== void 0 || rawBody.rankingPosition !== void 0 || rawBody.ranking_position !== void 0 || rawBody.status !== void 0 || rawBody.visitedStartupsIds !== void 0)) {
    return {
      ok: false,
      httpStatus: 403,
      code: "PROTECTED_FIELD_MUTATION_BLOCKED",
      error: "Opera\xE7\xE3o bloqueada (HTTP 403): n\xE3o \xE9 permitido alterar papel, permiss\xF5es, pontua\xE7\xE3o ou progresso por esta rota."
    };
  }
  const currentRow = targetDb.prepare("SELECT * FROM participants WHERE id = ? LIMIT 1").get(participantId);
  if (!currentRow) {
    return {
      ok: false,
      httpStatus: 404,
      code: "PARTICIPANT_NOT_FOUND",
      error: "Participante n\xE3o encontrado."
    };
  }
  const current = mapParticipantRow(currentRow);
  const rawName = rawBody.name !== void 0 ? String(rawBody.name).trim() : current.name;
  if (!rawName || rawName.length < 2) {
    return {
      ok: false,
      httpStatus: 400,
      code: "INVALID_NAME",
      error: "Informe um nome completo v\xE1lido (m\xEDnimo 2 caracteres)."
    };
  }
  const rawEmail = rawBody.email !== void 0 ? String(rawBody.email).trim().toLowerCase() : current.email.toLowerCase();
  if (!rawEmail || !EMAIL_VALIDATION_REGEX.test(rawEmail)) {
    return {
      ok: false,
      httpStatus: 400,
      code: "INVALID_EMAIL",
      error: "Informe um endere\xE7o de e-mail v\xE1lido."
    };
  }
  const emailOwner = targetDb.prepare("SELECT id FROM participants WHERE LOWER(email) = ? AND id != ? LIMIT 1").get(rawEmail, participantId);
  if (emailOwner) {
    return {
      ok: false,
      httpStatus: 409,
      code: "EMAIL_ALREADY_IN_USE",
      error: "Este e-mail j\xE1 est\xE1 cadastrado para outro participante."
    };
  }
  let nextPhone = current.phone ?? null;
  if (rawBody.phone !== void 0) {
    const phoneCheck = normalizeAndValidateBrazilianPhone(rawBody.phone);
    if (!phoneCheck.ok) {
      return {
        ok: false,
        httpStatus: 400,
        code: phoneCheck.code,
        error: phoneCheck.error
      };
    }
    nextPhone = phoneCheck.normalized;
  }
  const currentPassword = typeof rawBody.currentPassword === "string" ? rawBody.currentPassword : "";
  const newPassword = typeof rawBody.newPassword === "string" ? rawBody.newPassword : "";
  const confirmNewPassword = typeof rawBody.confirmNewPassword === "string" ? rawBody.confirmNewPassword : "";
  const wantsPasswordChange = Boolean(currentPassword || newPassword || confirmNewPassword);
  let nextPasswordHash = null;
  if (wantsPasswordChange) {
    if (!currentPassword) {
      return {
        ok: false,
        httpStatus: 400,
        code: "CURRENT_PASSWORD_REQUIRED",
        error: "Informe sua senha atual para definir uma nova senha."
      };
    }
    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
      return {
        ok: false,
        httpStatus: 400,
        code: "WEAK_PASSWORD",
        error: `A nova senha deve conter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`
      };
    }
    if (newPassword !== confirmNewPassword) {
      return {
        ok: false,
        httpStatus: 400,
        code: "PASSWORD_MISMATCH",
        error: "A nova senha e a confirma\xE7\xE3o n\xE3o coincidem."
      };
    }
    const storedHash = currentRow.password_hash ? String(currentRow.password_hash) : null;
    if (!verifyPassword(currentPassword, storedHash)) {
      return {
        ok: false,
        httpStatus: 401,
        code: "INVALID_CURRENT_PASSWORD",
        error: "A senha atual informada est\xE1 incorreta."
      };
    }
    nextPasswordHash = hashPassword(newPassword);
  }
  const nextNickname = rawBody.nickname !== void 0 && String(rawBody.nickname).trim().length > 0 ? String(rawBody.nickname).trim() : rawName.split(/\s+/)[0];
  const nextAvatar = computeInitialsFromName(rawName);
  targetDb.exec("BEGIN IMMEDIATE TRANSACTION;");
  try {
    if (nextPasswordHash) {
      targetDb.prepare(
        "UPDATE participants SET name = ?, nickname = ?, email = ?, phone = ?, avatar = ?, password_hash = ? WHERE id = ?"
      ).run(rawName, nextNickname, rawEmail, nextPhone, nextAvatar, nextPasswordHash, participantId);
    } else {
      targetDb.prepare("UPDATE participants SET name = ?, nickname = ?, email = ?, phone = ?, avatar = ? WHERE id = ?").run(rawName, nextNickname, rawEmail, nextPhone, nextAvatar, participantId);
    }
    if (rawEmail !== current.email.toLowerCase()) {
      targetDb.prepare("UPDATE auth_sessions SET user_email = ? WHERE user_id = ? AND revoked = 0").run(rawEmail, participantId);
    }
    targetDb.exec("COMMIT;");
  } catch (err) {
    targetDb.exec("ROLLBACK;");
    throw err;
  }
  const updatedRow = targetDb.prepare("SELECT * FROM participants WHERE id = ? LIMIT 1").get(participantId);
  return {
    ok: true,
    participant: mapParticipantRow(updatedRow),
    passwordChanged: Boolean(nextPasswordHash),
    message: nextPasswordHash ? "Dados cadastrais e senha atualizados com sucesso." : "Dados cadastrais atualizados com sucesso."
  };
}
app.put("/api/participants/me", requireAuth, (req, res) => {
  const rawBody = req.body || {};
  const session = req.authSession;
  const current = getAuthenticatedUserById(session.userId);
  if (!current) {
    res.status(401).json({
      error: "N\xE3o autenticado. Fa\xE7a login para atualizar seus dados.",
      code: "AUTH_REQUIRED"
    });
    return;
  }
  const result = updateParticipantProfileInDb(db, current.id, rawBody, {
    allowAdminFields: session.role === "ADMIN"
  });
  if (!result.ok) {
    res.status(result.httpStatus).json({
      error: result.error,
      code: result.code
    });
    return;
  }
  recalculateRankingsInDb();
  res.json({
    ok: true,
    participant: result.participant,
    passwordChanged: result.passwordChanged,
    message: result.message
  });
});
var CURRENT_IMAGE_CONSENT_VERSION = "v2-2026-11";
var CURRENT_IMAGE_CONSENT_TEXT = "Autorizo, de forma livre, opcional e revog\xE1vel a qualquer momento (LGPD, Art. 7\xBA, I), a divulga\xE7\xE3o institucional de fotos e v\xEDdeos registrados durante o Desafio Global Summit 2026 nos canais oficiais do evento e das startups participantes (Ex Devedor, Sign e Editora Escreva). As evid\xEAncias enviadas para valida\xE7\xE3o de miss\xF5es permanecem privadas e minha participa\xE7\xE3o ou pontua\xE7\xE3o n\xE3o dependem desta autoriza\xE7\xE3o.";
app.get("/api/participants/me/image-consent", requireAuth, (req, res) => {
  const current = getAuthenticatedUserById(req.authSession.userId);
  if (!current) {
    res.status(401).json({
      error: "Sess\xE3o inv\xE1lida ou usu\xE1rio n\xE3o encontrado.",
      code: "AUTH_REQUIRED"
    });
    return;
  }
  res.json({
    authorized: Boolean(current.imagePublicityConsent),
    updatedAt: current.imagePublicityConsentUpdatedAt ?? null,
    version: current.imagePublicityConsentVersion ?? null,
    currentVersion: CURRENT_IMAGE_CONSENT_VERSION,
    consentText: CURRENT_IMAGE_CONSENT_TEXT,
    optional: true,
    legalBasis: "Consentimento livre, informado e revog\xE1vel (LGPD, Art. 7\xBA, I)",
    validationNote: "O envio de evid\xEAncias para valida\xE7\xE3o de miss\xF5es independe desta autoriza\xE7\xE3o e permanece privado."
  });
});
app.put("/api/participants/me/image-consent", requireAuth, (req, res) => {
  const { authorized } = req.body || {};
  if (typeof authorized !== "boolean") {
    res.status(400).json({
      error: 'Informe o campo booleano "authorized" (true ou false).',
      code: "INVALID_CONSENT_VALUE"
    });
    return;
  }
  const userId = req.authSession.userId;
  const current = getAuthenticatedUserById(userId);
  if (!current) {
    res.status(401).json({
      error: "Sess\xE3o inv\xE1lida ou usu\xE1rio n\xE3o encontrado.",
      code: "AUTH_REQUIRED"
    });
    return;
  }
  const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  db.prepare(
    `UPDATE participants
     SET image_publicity_consent = ?,
         image_publicity_consent_updated_at = ?,
         image_publicity_consent_version = ?
     WHERE id = ?`
  ).run(authorized ? 1 : 0, updatedAt, CURRENT_IMAGE_CONSENT_VERSION, userId);
  res.json({
    ok: true,
    authorized,
    updatedAt,
    version: CURRENT_IMAGE_CONSENT_VERSION,
    message: authorized ? "Autoriza\xE7\xE3o opcional para divulga\xE7\xE3o p\xFAblica de imagem registrada com sucesso." : "Autoriza\xE7\xE3o para divulga\xE7\xE3o p\xFAblica de imagem revogada. A revoga\xE7\xE3o n\xE3o impede sua participa\xE7\xE3o nem o envio de evid\xEAncias."
  });
});
app.patch("/api/participants/:id/role", requireAdmin, (_req, res) => {
  res.status(403).json({
    error: "Opera\xE7\xE3o bloqueada: promo\xE7\xE3o de contas a ADMIN s\xF3 pode ser realizada via script seguro de provisionamento no servidor.",
    code: "ROLE_MUTATION_RESTRICTED"
  });
});
app.patch("/api/participants/:id/status", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status, role } = req.body;
  if (role !== void 0) {
    res.status(403).json({
      error: "N\xE3o \xE9 permitido alterar o papel (role) de usu\xE1rios por este endpoint."
    });
    return;
  }
  db.prepare("UPDATE participants SET status = ? WHERE id = ?").run(status, id);
  const rows = db.prepare(
    "SELECT * FROM participants WHERE UPPER(role) = 'PARTICIPANT' ORDER BY ranking_position ASC"
  ).all();
  res.json(rows.map(mapParticipantRow));
});
function resetParticipantPasswordInDb(targetDb, params) {
  const newPassword = typeof params.newPassword === "string" ? params.newPassword : "";
  const confirmPassword = typeof params.confirmPassword === "string" ? params.confirmPassword : "";
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      httpStatus: 400,
      code: "WEAK_PASSWORD",
      error: `A nova senha deve conter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`
    };
  }
  if (newPassword !== confirmPassword) {
    return {
      ok: false,
      httpStatus: 400,
      code: "PASSWORD_MISMATCH",
      error: "A nova senha e a confirma\xE7\xE3o n\xE3o coincidem."
    };
  }
  const targetRow = targetDb.prepare("SELECT id, role FROM participants WHERE id = ? LIMIT 1").get(params.participantId);
  if (!targetRow) {
    return {
      ok: false,
      httpStatus: 404,
      code: "PARTICIPANT_NOT_FOUND",
      error: "Participante n\xE3o encontrado."
    };
  }
  if (String(targetRow.role || "").toUpperCase() !== "PARTICIPANT") {
    return {
      ok: false,
      httpStatus: 403,
      code: "ADMIN_PASSWORD_RESET_FORBIDDEN",
      error: "Opera\xE7\xE3o negada: n\xE3o \xE9 permitido redefinir senha de contas administrativas por este endpoint."
    };
  }
  const nextPasswordHash = hashPassword(newPassword);
  const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  let sessionsRevoked = 0;
  targetDb.exec("BEGIN IMMEDIATE TRANSACTION;");
  try {
    const updateRes = targetDb.prepare("UPDATE participants SET password_hash = ? WHERE id = ? AND UPPER(role) = 'PARTICIPANT'").run(nextPasswordHash, targetRow.id);
    if (Number(updateRes.changes) !== 1) {
      throw new Error("PARTICIPANT_PASSWORD_UPDATE_FAILED");
    }
    const revokeRes = targetDb.prepare("UPDATE auth_sessions SET revoked = 1 WHERE user_id = ?").run(targetRow.id);
    sessionsRevoked = Number(revokeRes.changes || 0);
    targetDb.exec("COMMIT;");
  } catch (err) {
    try {
      targetDb.exec("ROLLBACK;");
    } catch {
    }
    throw err;
  }
  console.log(
    `[AdminAudit] Redefini\xE7\xE3o administrativa de senha executada: adminId=${params.adminId} targetParticipantId=${targetRow.id} sessionsRevoked=${sessionsRevoked} timestamp=${updatedAt}`
  );
  return {
    ok: true,
    httpStatus: 200,
    participantId: targetRow.id,
    sessionsRevoked,
    updatedAt,
    message: "Senha do participante redefinida com sucesso e sess\xF5es anteriores revogadas."
  };
}
app.post("/api/participants/:id/reset-password", requireAdmin, (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const adminId = req.authSession.userId;
  const result = resetParticipantPasswordInDb(db, {
    adminId,
    participantId: id,
    newPassword: body.newPassword,
    confirmPassword: body.confirmPassword
  });
  if (!result.ok) {
    res.status(result.httpStatus).json({
      ok: false,
      error: result.error,
      code: result.code
    });
    return;
  }
  res.status(200).json({
    ok: true,
    participantId: result.participantId,
    sessionsRevoked: result.sessionsRevoked,
    updatedAt: result.updatedAt,
    message: result.message
  });
});
app.get("/api/startups", (req, res) => {
  const session = resolveSessionFromRequest(req);
  const isAdmin = session?.role === "ADMIN";
  const rows = isAdmin ? db.prepare("SELECT * FROM startups").all() : db.prepare("SELECT * FROM startups WHERE active = 1").all();
  res.json(rows.map(mapStartupRow));
});
app.post("/api/startups", requireAdmin, (req, res) => {
  const payload = req.body;
  const newId = `st-${Date.now()}`;
  db.prepare(`
    INSERT INTO startups (
      id, name, short_name, tagline, description, category,
      solution_presentation, booth_number, logo_text, available_points,
      active, is_configurable_guest, website
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    newId,
    payload.name,
    payload.shortName || payload.name,
    payload.tagline || "",
    payload.description || "",
    payload.category || "Ecossistema",
    payload.solutionPresentation || "",
    payload.boothNumber || "Pavilh\xE3o Inova\xE7\xE3o",
    payload.logoText || "START",
    Number(payload.availablePoints || 500),
    payload.active === false ? 0 : 1,
    payload.isConfigurableGuest ? 1 : 0,
    payload.website || null
  );
  const created = db.prepare("SELECT * FROM startups WHERE id = ?").get(newId);
  res.status(201).json(mapStartupRow(created));
});
app.put("/api/startups/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const existingRow = db.prepare("SELECT * FROM startups WHERE id = ?").get(id);
  if (!existingRow) {
    res.status(404).json({ error: "Startup n\xE3o encontrada" });
    return;
  }
  const current = mapStartupRow(existingRow);
  const u = req.body;
  db.prepare(`
    UPDATE startups
    SET name = ?, short_name = ?, tagline = ?, description = ?,
        category = ?, solution_presentation = ?, booth_number = ?,
        logo_text = ?, available_points = ?, active = ?
    WHERE id = ?
  `).run(
    u.name ?? current.name,
    u.shortName ?? current.shortName,
    u.tagline ?? current.tagline,
    u.description ?? current.description,
    u.category ?? current.category,
    u.solutionPresentation ?? current.solutionPresentation,
    u.boothNumber ?? current.boothNumber,
    u.logoText ?? current.logoText,
    Number(u.availablePoints ?? current.availablePoints),
    u.active ?? current.active ? 1 : 0,
    id
  );
  const rows = db.prepare("SELECT * FROM startups").all();
  res.json(rows.map(mapStartupRow));
});
app.patch("/api/startups/:id/toggle", requireAdmin, (req, res) => {
  const { id } = req.params;
  db.prepare("UPDATE startups SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?").run(
    id
  );
  const rows = db.prepare("SELECT * FROM startups").all();
  res.json(rows.map(mapStartupRow));
});
app.delete("/api/startups/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM startups WHERE id = ?").run(id);
  const rows = db.prepare("SELECT * FROM startups").all();
  res.json(rows.map(mapStartupRow));
});
app.get("/api/missions", (req, res) => {
  const session = resolveSessionFromRequest(req);
  if (session?.role === "ADMIN") {
    const rows = db.prepare(
      "SELECT * FROM missions ORDER BY CASE WHEN sequence_order IS NOT NULL THEN 0 ELSE 1 END, sequence_order ASC, rowid ASC"
    ).all();
    res.json(rows.map(mapMissionRow));
    return;
  }
  if (session?.role === "PARTICIPANT") {
    const participant = getAuthenticatedUserById(session.userId);
    if (participant) {
      res.json(getParticipantMissionsFromDb(participant));
      return;
    }
  }
  const publicRows = db.prepare(
    "SELECT * FROM missions WHERE active = 1 ORDER BY CASE WHEN sequence_order IS NOT NULL THEN 0 ELSE 1 END, sequence_order ASC, rowid ASC"
  ).all();
  res.json(publicRows.map(mapMissionRow));
});
app.post("/api/missions", requireAdmin, (req, res) => {
  const p = req.body;
  const isOfficial = p.missionType === "official" || p.missionType !== "extra" && p.sequenceOrder !== null && p.sequenceOrder !== void 0 && p.sequenceOrder !== "";
  db.exec("BEGIN IMMEDIATE TRANSACTION;");
  try {
    let sequenceOrder = null;
    if (isOfficial) {
      if (hasOfficialCircuitStartedInDb(db)) {
        db.exec("ROLLBACK;");
        res.status(409).json({
          error: "O circuito oficial j\xE1 foi iniciado por participantes. A cria\xE7\xE3o de novas miss\xF5es oficiais est\xE1 bloqueada.",
          code: "CIRCUIT_LOCKED"
        });
        return;
      }
      const parsedSeq = Number(p.sequenceOrder);
      if (!Number.isInteger(parsedSeq) || parsedSeq < 1) {
        db.exec("ROLLBACK;");
        res.status(400).json({
          error: "A ordem sequencial \xE9 obrigat\xF3ria e deve ser um n\xFAmero inteiro positivo para miss\xF5es do circuito oficial.",
          code: "INVALID_SEQUENCE_ORDER"
        });
        return;
      }
      const trackKeyForInsert = p.trackId ? String(p.trackId).trim() : null;
      const existingSeq = db.prepare(
        "SELECT id, title FROM missions WHERE COALESCE(track_id, 'default') = ? AND sequence_order = ? LIMIT 1"
      ).get(trackKeyForInsert || "default", parsedSeq);
      if (existingSeq) {
        db.exec("ROLLBACK;");
        res.status(409).json({
          error: `A posi\xE7\xE3o ${parsedSeq} j\xE1 est\xE1 ocupada pela miss\xE3o "${existingSeq.title}". Escolha outra ordem sequencial.`,
          code: "SEQUENCE_ORDER_DUPLICATE"
        });
        return;
      }
      sequenceOrder = parsedSeq;
    }
    const parsedTimerMinutes = p.timerMinutes !== null && p.timerMinutes !== void 0 && p.timerMinutes !== "" ? Math.max(1, Math.min(30, Math.trunc(Number(p.timerMinutes)))) : null;
    const parsedRelativeWeight = p.relativeWeight !== null && p.relativeWeight !== void 0 && p.relativeWeight !== "" ? Math.max(1, Math.trunc(Number(p.relativeWeight))) : 10;
    const parsedMaxVideoSeconds = p.maxVideoSeconds !== null && p.maxVideoSeconds !== void 0 && p.maxVideoSeconds !== "" ? Math.max(1, Math.min(300, Math.trunc(Number(p.maxVideoSeconds)))) : null;
    const trackIdValue = p.trackId ? String(p.trackId).trim() : null;
    const allowSharedEvidence = Boolean(p.allowSharedEvidence) ? 1 : 0;
    const externalLink = p.externalLink ? String(p.externalLink).trim() : null;
    const points = isOfficial ? 0 : Number(p.points || 200);
    const unlockPoints = 0;
    const completionPoints = isOfficial ? 0 : points;
    const maxSpeedBonus = 0;
    const requiresEvidence = Boolean(p.requiresEvidence) ? 1 : 0;
    const rawEvidenceType = String(p.evidenceType || "").toLowerCase();
    const validEvTypes = [
      "photo",
      "print",
      "video",
      "photo_or_video",
      "text",
      "file",
      "both"
    ];
    const evidenceType = requiresEvidence ? validEvTypes.includes(rawEvidenceType) ? rawEvidenceType : "photo" : null;
    const newId = `ms-${Date.now()}`;
    db.prepare(`
      INSERT INTO missions (
        id, title, description, startup_id, startup_name, category,
        points, estimated_time, status, period, completion_criteria,
        active, qr_code_required, quiz_questions_json,
        sequence_order, track_id, relative_weight, timer_minutes,
        unlock_points, completion_points, max_speed_bonus,
        requires_evidence, evidence_type, max_video_seconds,
        allow_shared_evidence, external_link
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId,
      p.title,
      p.description,
      p.startupId,
      p.startupName,
      p.category,
      points,
      p.estimatedTime || "4 min",
      p.status || "Dispon\xEDvel",
      p.period || "24 a 26/11/2026",
      p.completionCriteria || "",
      p.active === false ? 0 : 1,
      p.qrCodeRequired || null,
      p.quizQuestions ? JSON.stringify(p.quizQuestions) : null,
      sequenceOrder,
      trackIdValue,
      parsedRelativeWeight,
      parsedTimerMinutes,
      unlockPoints,
      completionPoints,
      maxSpeedBonus,
      requiresEvidence,
      evidenceType,
      parsedMaxVideoSeconds,
      allowSharedEvidence,
      externalLink
    );
    if (isOfficial && p.active !== false) {
      compactCircuitSequencesInDb(db);
      recalculateCircuitMissionPointsInDb(db);
    }
    db.exec("COMMIT;");
    const created = db.prepare("SELECT * FROM missions WHERE id = ?").get(newId);
    res.status(201).json(mapMissionRow(created));
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
});
app.put("/api/missions/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  db.exec("BEGIN IMMEDIATE TRANSACTION;");
  try {
    const row = db.prepare("SELECT * FROM missions WHERE id = ?").get(id);
    if (!row) {
      db.exec("ROLLBACK;");
      res.status(404).json({ error: "Miss\xE3o n\xE3o encontrada" });
      return;
    }
    const current = mapMissionRow(row);
    const u = req.body;
    const currentIsOfficial = current.sequenceOrder !== null && current.sequenceOrder !== void 0;
    const isStarted = hasOfficialCircuitStartedInDb(db);
    const validEvTypes = [
      "photo",
      "print",
      "video",
      "photo_or_video",
      "text",
      "file",
      "both"
    ];
    if (isStarted) {
      if (currentIsOfficial) {
        if (u.missionType === "extra" || u.sequenceOrder === null && u.missionType !== "official") {
          db.exec("ROLLBACK;");
          res.status(409).json({
            error: "O circuito oficial j\xE1 foi iniciado por participantes. N\xE3o \xE9 permitido rebaixar uma miss\xE3o oficial para extra.",
            code: "CIRCUIT_LOCKED"
          });
          return;
        }
        if (u.sequenceOrder !== void 0 && u.sequenceOrder !== null && Number(u.sequenceOrder) !== current.sequenceOrder) {
          db.exec("ROLLBACK;");
          res.status(409).json({
            error: "O circuito oficial j\xE1 foi iniciado por participantes. A ordem sequencial das miss\xF5es oficiais est\xE1 bloqueada.",
            code: "CIRCUIT_LOCKED"
          });
          return;
        }
        if (u.active !== void 0 && Boolean(u.active) !== Boolean(current.active)) {
          db.exec("ROLLBACK;");
          res.status(409).json({
            error: "O circuito oficial j\xE1 foi iniciado por participantes. N\xE3o \xE9 permitido desativar ou alterar o status ativo de miss\xF5es oficiais.",
            code: "CIRCUIT_LOCKED"
          });
          return;
        }
        if (u.timerMinutes !== void 0 && (u.timerMinutes === null ? current.timerMinutes !== null : Number(u.timerMinutes) !== current.timerMinutes)) {
          db.exec("ROLLBACK;");
          res.status(409).json({
            error: "O circuito oficial j\xE1 foi iniciado por participantes. O tempo do cron\xF4metro das miss\xF5es oficiais est\xE1 bloqueado.",
            code: "CIRCUIT_LOCKED"
          });
          return;
        }
        if (u.completionCriteria !== void 0 && String(u.completionCriteria).trim() !== String(current.completionCriteria).trim()) {
          db.exec("ROLLBACK;");
          res.status(409).json({
            error: "O circuito oficial j\xE1 foi iniciado por participantes. Os crit\xE9rios de conclus\xE3o das miss\xF5es oficiais est\xE3o bloqueados.",
            code: "CIRCUIT_LOCKED"
          });
          return;
        }
        if (u.requiresEvidence !== void 0 && Boolean(u.requiresEvidence) !== Boolean(current.requiresEvidence) || u.evidenceType !== void 0 && (u.evidenceType || void 0) !== (current.evidenceType || void 0)) {
          db.exec("ROLLBACK;");
          res.status(409).json({
            error: "O circuito oficial j\xE1 foi iniciado por participantes. A configura\xE7\xE3o de evid\xEAncia das miss\xF5es oficiais est\xE1 bloqueada.",
            code: "CIRCUIT_LOCKED"
          });
          return;
        }
        if (u.points !== void 0 && Number(u.points) !== current.points) {
          db.exec("ROLLBACK;");
          res.status(409).json({
            error: "O circuito oficial j\xE1 foi iniciado por participantes. A pontua\xE7\xE3o das miss\xF5es oficiais \xE9 gerenciada dinamicamente pelo sistema.",
            code: "CIRCUIT_LOCKED"
          });
          return;
        }
        db.prepare(`
          UPDATE missions
          SET title = ?, description = ?
          WHERE id = ?
        `).run(
          u.title ?? current.title,
          u.description ?? current.description,
          id
        );
        db.exec("COMMIT;");
        const rows2 = db.prepare(
          "SELECT * FROM missions ORDER BY CASE WHEN sequence_order IS NOT NULL THEN 0 ELSE 1 END, sequence_order ASC, rowid ASC"
        ).all();
        res.json(rows2.map(mapMissionRow));
        return;
      } else {
        const wantsOfficial = u.missionType === "official" || u.sequenceOrder !== void 0 && u.sequenceOrder !== null && u.sequenceOrder !== "";
        if (wantsOfficial) {
          db.exec("ROLLBACK;");
          res.status(409).json({
            error: "O circuito oficial j\xE1 foi iniciado por participantes. N\xE3o \xE9 permitido promover miss\xF5es extras para o circuito oficial.",
            code: "CIRCUIT_LOCKED"
          });
          return;
        }
        const parsedTimerMinutes2 = u.timerMinutes !== void 0 ? u.timerMinutes !== null && u.timerMinutes !== "" ? Math.max(1, Math.min(30, Math.trunc(Number(u.timerMinutes)))) : null : current.timerMinutes ?? null;
        const nextExtraRequiresEvidence = u.requiresEvidence !== void 0 ? Boolean(u.requiresEvidence) ? 1 : 0 : current.requiresEvidence ? 1 : 0;
        const rawExtraEvType = String(u.evidenceType ?? current.evidenceType ?? "").toLowerCase();
        const nextExtraEvidenceType = nextExtraRequiresEvidence ? rawExtraEvType === "photo" || rawExtraEvType === "file" || rawExtraEvType === "both" ? rawExtraEvType : "photo" : null;
        db.prepare(`
          UPDATE missions
          SET title = ?, description = ?, startup_id = ?, startup_name = ?,
              category = ?, points = ?, estimated_time = ?, status = ?,
              period = ?, completion_criteria = ?, active = ?,
              sequence_order = NULL, timer_minutes = ?,
              requires_evidence = ?, evidence_type = ?
          WHERE id = ?
        `).run(
          u.title ?? current.title,
          u.description ?? current.description,
          u.startupId ?? current.startupId,
          u.startupName ?? current.startupName,
          u.category ?? current.category,
          Number(u.points ?? current.points),
          u.estimatedTime ?? current.estimatedTime,
          u.status ?? current.status,
          u.period ?? current.period,
          u.completionCriteria ?? current.completionCriteria,
          u.active ?? current.active ? 1 : 0,
          parsedTimerMinutes2,
          nextExtraRequiresEvidence,
          nextExtraEvidenceType,
          id
        );
        db.exec("COMMIT;");
        const rows2 = db.prepare(
          "SELECT * FROM missions ORDER BY CASE WHEN sequence_order IS NOT NULL THEN 0 ELSE 1 END, sequence_order ASC, rowid ASC"
        ).all();
        res.json(rows2.map(mapMissionRow));
        return;
      }
    }
    let newSequenceOrder = current.sequenceOrder ?? null;
    if (u.missionType === "extra") {
      newSequenceOrder = null;
    } else if (u.missionType === "official" || u.sequenceOrder !== void 0 && u.sequenceOrder !== null && u.sequenceOrder !== "") {
      const parsedSeq = Number(u.sequenceOrder);
      if (!Number.isInteger(parsedSeq) || parsedSeq < 1) {
        db.exec("ROLLBACK;");
        res.status(400).json({
          error: "A ordem sequencial deve ser um n\xFAmero inteiro positivo para miss\xF5es do circuito oficial.",
          code: "INVALID_SEQUENCE_ORDER"
        });
        return;
      }
      const nextTrackKey = u.trackId !== void 0 ? String(u.trackId || "default") : String(current.trackId || "default");
      const duplicate = db.prepare(
        "SELECT id, title FROM missions WHERE COALESCE(track_id, 'default') = ? AND sequence_order = ? AND id != ? LIMIT 1"
      ).get(nextTrackKey, parsedSeq, id);
      if (duplicate) {
        db.exec("ROLLBACK;");
        res.status(409).json({
          error: `A posi\xE7\xE3o ${parsedSeq} j\xE1 est\xE1 ocupada pela miss\xE3o "${duplicate.title}". Escolha outra ordem sequencial.`,
          code: "SEQUENCE_ORDER_DUPLICATE"
        });
        return;
      }
      newSequenceOrder = parsedSeq;
    }
    const parsedTimerMinutes = u.timerMinutes !== void 0 ? u.timerMinutes !== null && u.timerMinutes !== "" ? Math.max(1, Math.min(30, Math.trunc(Number(u.timerMinutes)))) : null : current.timerMinutes ?? null;
    const parsedRelativeWeight = u.relativeWeight !== void 0 && u.relativeWeight !== null && u.relativeWeight !== "" ? Math.max(1, Math.trunc(Number(u.relativeWeight))) : current.relativeWeight ?? 10;
    const parsedMaxVideoSeconds = u.maxVideoSeconds !== void 0 ? u.maxVideoSeconds !== null && u.maxVideoSeconds !== "" ? Math.max(1, Math.min(300, Math.trunc(Number(u.maxVideoSeconds)))) : null : current.maxVideoSeconds ?? null;
    const nextTrackId = u.trackId !== void 0 ? u.trackId ? String(u.trackId).trim() : null : current.trackId ?? null;
    const willBeActive = u.active ?? current.active ? 1 : 0;
    if (willBeActive === 0 && newSequenceOrder !== null) {
      newSequenceOrder = null;
    }
    const nextRequiresEvidence = u.requiresEvidence !== void 0 ? Boolean(u.requiresEvidence) ? 1 : 0 : current.requiresEvidence ? 1 : 0;
    const rawNextEvType = String(u.evidenceType ?? current.evidenceType ?? "").toLowerCase();
    const nextEvidenceType = nextRequiresEvidence ? validEvTypes.includes(rawNextEvType) ? rawNextEvType : "photo" : null;
    db.prepare(`
      UPDATE missions
      SET title = ?, description = ?, startup_id = ?, startup_name = ?,
          category = ?, points = ?, estimated_time = ?, status = ?,
          period = ?, completion_criteria = ?, active = ?,
          sequence_order = ?, track_id = ?, relative_weight = ?, timer_minutes = ?,
          requires_evidence = ?, evidence_type = ?, max_video_seconds = ?
      WHERE id = ?
    `).run(
      u.title ?? current.title,
      u.description ?? current.description,
      u.startupId ?? current.startupId,
      u.startupName ?? current.startupName,
      u.category ?? current.category,
      Number(u.points ?? current.points),
      u.estimatedTime ?? current.estimatedTime,
      u.status ?? current.status,
      u.period ?? current.period,
      u.completionCriteria ?? current.completionCriteria,
      willBeActive,
      newSequenceOrder,
      nextTrackId,
      parsedRelativeWeight,
      parsedTimerMinutes,
      nextRequiresEvidence,
      nextEvidenceType,
      parsedMaxVideoSeconds,
      id
    );
    const hasOfficial = db.prepare(
      "SELECT COUNT(*) as count FROM missions WHERE active = 1 AND sequence_order IS NOT NULL"
    ).get();
    if (hasOfficial.count > 0) {
      compactCircuitSequencesInDb(db);
      recalculateCircuitMissionPointsInDb(db);
    }
    db.exec("COMMIT;");
    const rows = db.prepare(
      "SELECT * FROM missions ORDER BY CASE WHEN sequence_order IS NOT NULL THEN 0 ELSE 1 END, sequence_order ASC, rowid ASC"
    ).all();
    res.json(rows.map(mapMissionRow));
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
});
function startMissionForParticipant(participantId, missionId) {
  db.exec("BEGIN IMMEDIATE TRANSACTION;");
  try {
    ensureParticipantFirstMissionUnlockedInDb(participantId);
    const missionRow = db.prepare("SELECT * FROM missions WHERE id = ? LIMIT 1").get(missionId);
    if (!missionRow || !missionRow.active || missionRow.sequence_order === null) {
      db.exec("ROLLBACK;");
      return {
        ok: false,
        httpStatus: 404,
        errorCode: "MISSION_NOT_FOUND",
        error: "Miss\xE3o n\xE3o encontrada ou inativa."
      };
    }
    const seqOrder = Number(missionRow.sequence_order);
    const missionTrackKey = missionRow.track_id ? String(missionRow.track_id) : "default";
    if (seqOrder > 1) {
      const prevMission = db.prepare(
        "SELECT id, title FROM missions WHERE COALESCE(track_id, 'default') = ? AND sequence_order = ? AND active = 1 LIMIT 1"
      ).get(missionTrackKey, seqOrder - 1);
      if (prevMission) {
        const prevCompleteTx = findActiveTransactionByEventKeys(participantId, [
          `COMPLETE:${participantId}:${prevMission.id}`,
          `COMPLETE:${participantId}:${prevMission.id}:POST_SIM_REV`
        ]);
        const prevPm = db.prepare(
          "SELECT status FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1"
        ).get(participantId, prevMission.id);
        const isPrevCompleted = Boolean(prevCompleteTx) || prevPm && String(prevPm.status) === "Conclu\xEDda";
        if (!isPrevCompleted) {
          db.exec("ROLLBACK;");
          return {
            ok: false,
            httpStatus: 403,
            errorCode: "MISSION_LOCKED",
            error: `Miss\xE3o bloqueada: conclua e aguarde a aprova\xE7\xE3o da Miss\xE3o 0${seqOrder - 1} ("${prevMission.title}") para desbloquear esta miss\xE3o.`
          };
        }
      }
    }
    const nowMs = Date.now();
    const otherActivePm = db.prepare(`
        SELECT pm.mission_id, pm.target_end_at_ms, m.title
        FROM participant_missions pm
        INNER JOIN missions m ON m.id = pm.mission_id
        WHERE pm.participant_id = ?
          AND pm.status = 'Em andamento'
          AND pm.mission_id != ?
          AND m.active = 1
        LIMIT 1
      `).get(participantId, missionId);
    if (otherActivePm) {
      const otherTargetEnd = otherActivePm.target_end_at_ms ? Number(otherActivePm.target_end_at_ms) : null;
      const otherIsStillRunning = otherTargetEnd === null || nowMs < otherTargetEnd;
      if (otherIsStillRunning) {
        db.exec("ROLLBACK;");
        return {
          ok: false,
          httpStatus: 409,
          errorCode: "ACTIVE_TIMER_CONFLICT",
          error: `Voc\xEA j\xE1 possui uma miss\xE3o em andamento ("${otherActivePm.title}"). Envie a evid\xEAncia dela antes de iniciar outra miss\xE3o.`
        };
      }
    }
    const currentPm = db.prepare(
      "SELECT * FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1"
    ).get(participantId, missionId);
    if (currentPm && String(currentPm.status) === "Conclu\xEDda") {
      db.exec("ROLLBACK;");
      return {
        ok: false,
        httpStatus: 409,
        errorCode: "ALREADY_COMPLETED",
        error: "Esta miss\xE3o j\xE1 foi conclu\xEDda anteriormente."
      };
    }
    if (currentPm && String(currentPm.status) === "Aguardando valida\xE7\xE3o") {
      db.exec("ROLLBACK;");
      return {
        ok: false,
        httpStatus: 409,
        errorCode: "AWAITING_VALIDATION",
        error: "Sua evid\xEAncia j\xE1 foi enviada e est\xE1 aguardando an\xE1lise administrativa."
      };
    }
    const durationSeconds = currentPm?.duration_seconds ? Number(currentPm.duration_seconds) : getMissionConfiguredDurationSeconds(missionId);
    const targetEndAtMs = currentPm?.target_end_at_ms ? Number(currentPm.target_end_at_ms) : nowMs + durationSeconds * 1e3;
    db.prepare(`
      UPDATE participant_missions
      SET status = 'Em andamento',
          started_at_ms = COALESCE(started_at_ms, ?),
          duration_seconds = COALESCE(duration_seconds, ?),
          target_end_at_ms = COALESCE(target_end_at_ms, ?)
      WHERE participant_id = ? AND mission_id = ?
    `).run(nowMs, durationSeconds, targetEndAtMs, participantId, missionId);
    const updatedPm = db.prepare(
      "SELECT * FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1"
    ).get(participantId, missionId);
    const effectiveStartedAtMs = Number(updatedPm.started_at_ms || nowMs);
    const effectiveDurationSeconds = Number(updatedPm.duration_seconds || durationSeconds);
    const effectiveTargetEndAtMs = Number(updatedPm.target_end_at_ms || targetEndAtMs);
    const elapsedSeconds = Math.max(0, Math.round((nowMs - effectiveStartedAtMs) / 1e3));
    const remainingSeconds = Math.max(0, Math.ceil((effectiveTargetEndAtMs - nowMs) / 1e3));
    const isExpired = remainingSeconds <= 0;
    const rawBonus = missionRow.max_speed_bonus;
    if (rawBonus === null || rawBonus === void 0 || !Number.isInteger(Number(rawBonus)) || Number(rawBonus) < 0) {
      db.exec("ROLLBACK;");
      return {
        ok: false,
        httpStatus: 500,
        errorCode: "INVALID_CIRCUIT_SCORING",
        error: `Erro cont\xE1bil: a miss\xE3o oficial "${missionRow.title}" n\xE3o possui max_speed_bonus din\xE2mico v\xE1lido no banco.`
      };
    }
    const missionMaxBonus = Number(rawBonus);
    const potentialSpeedBonus = isExpired ? 0 : Math.max(
      0,
      Math.min(missionMaxBonus, Math.round(missionMaxBonus * (remainingSeconds / effectiveDurationSeconds)))
    );
    db.exec("COMMIT;");
    return {
      ok: true,
      httpStatus: 200,
      data: {
        success: true,
        missionId,
        status: "Em andamento",
        startedAtMs: effectiveStartedAtMs,
        durationSeconds: effectiveDurationSeconds,
        targetEndAtMs: effectiveTargetEndAtMs,
        serverTimeMs: nowMs,
        elapsedSeconds,
        remainingSeconds,
        potentialSpeedBonus,
        isExpired,
        message: `Miss\xE3o "${missionRow.title}" iniciada! Tempo de execu\xE7\xE3o: ${Math.round(effectiveDurationSeconds / 60)} min.`
      }
    };
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
}
app.post("/api/missions/:id/start", requireParticipant, (req, res) => {
  const { id } = req.params;
  const participantId = req.authSession.userId;
  const result = startMissionForParticipant(participantId, id);
  if (!result.ok) {
    res.status(result.httpStatus).json({
      success: false,
      errorCode: result.errorCode,
      error: result.error
    });
    return;
  }
  res.json(result.data);
});
app.get("/api/missions/:id/timer", requireParticipant, (req, res) => {
  const { id } = req.params;
  const participantId = req.authSession.userId;
  const pm = db.prepare(
    "SELECT * FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1"
  ).get(participantId, id);
  const missionRow = db.prepare("SELECT * FROM missions WHERE id = ? LIMIT 1").get(id);
  if (!missionRow) {
    res.status(404).json({ error: "Miss\xE3o n\xE3o encontrada" });
    return;
  }
  const isOfficial = missionRow.sequence_order !== null && missionRow.sequence_order !== void 0;
  const rawMaxBonus = missionRow.max_speed_bonus;
  if (isOfficial && (rawMaxBonus === null || rawMaxBonus === void 0 || !Number.isInteger(Number(rawMaxBonus)) || Number(rawMaxBonus) < 0)) {
    res.status(500).json({
      error: `Erro cont\xE1bil: a miss\xE3o oficial "${missionRow.title}" n\xE3o possui max_speed_bonus din\xE2mico v\xE1lido no banco.`,
      code: "INVALID_CIRCUIT_SCORING"
    });
    return;
  }
  const missionMaxBonus = isOfficial ? Number(rawMaxBonus) : Number.isInteger(Number(rawMaxBonus)) && Number(rawMaxBonus) >= 0 ? Number(rawMaxBonus) : 0;
  const nowMs = Date.now();
  const durationSeconds = pm?.duration_seconds ? Number(pm.duration_seconds) : getMissionConfiguredDurationSeconds(id);
  if (!pm || !pm.started_at_ms) {
    res.json({
      missionId: id,
      status: pm ? String(pm.status) : "Dispon\xEDvel",
      startedAtMs: null,
      durationSeconds,
      targetEndAtMs: null,
      serverTimeMs: nowMs,
      elapsedSeconds: 0,
      remainingSeconds: durationSeconds,
      potentialSpeedBonus: missionMaxBonus,
      speedBonusAwarded: 0,
      isExpired: false
    });
    return;
  }
  const startedAtMs = Number(pm.started_at_ms);
  const targetEndAtMs = pm.target_end_at_ms ? Number(pm.target_end_at_ms) : startedAtMs + durationSeconds * 1e3;
  const isCompleted = String(pm.status) === "Conclu\xEDda";
  let elapsedSeconds = 0;
  let remainingSeconds = durationSeconds;
  if (isCompleted && pm.completed_at_ms) {
    elapsedSeconds = Math.max(0, Math.round((Number(pm.completed_at_ms) - startedAtMs) / 1e3));
    remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
  } else {
    elapsedSeconds = Math.max(0, Math.round((nowMs - startedAtMs) / 1e3));
    remainingSeconds = Math.max(0, Math.ceil((targetEndAtMs - nowMs) / 1e3));
  }
  const isExpired = remainingSeconds <= 0;
  const potentialSpeedBonus = isCompleted ? 0 : isExpired ? 0 : Math.max(0, Math.min(missionMaxBonus, Math.round(missionMaxBonus * (remainingSeconds / durationSeconds))));
  res.json({
    missionId: id,
    status: String(pm.status),
    startedAtMs,
    durationSeconds,
    targetEndAtMs,
    serverTimeMs: nowMs,
    elapsedSeconds,
    remainingSeconds,
    potentialSpeedBonus,
    speedBonusAwarded: Number(pm.speed_bonus_awarded || 0),
    isExpired
  });
});
app.patch("/api/missions/:id/status", requireParticipant, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const currentParticipant = getAuthenticatedUserById(req.authSession.userId);
  if (!currentParticipant) {
    res.status(401).json({
      success: false,
      error: "Sess\xE3o de participante inv\xE1lida.",
      code: "AUTH_REQUIRED"
    });
    return;
  }
  ensureParticipantFirstMissionUnlockedInDb(currentParticipant.id);
  if (status !== "Em andamento") {
    res.status(403).json({
      success: false,
      errorCode: "DIRECT_UNLOCK_FORBIDDEN",
      error: "Opera\xE7\xE3o bloqueada: n\xE3o \xE9 permitido desbloquear ou concluir miss\xF5es diretamente. Siga a sequ\xEAncia obrigat\xF3ria."
    });
    return;
  }
  const result = startMissionForParticipant(currentParticipant.id, id);
  if (!result.ok) {
    res.status(result.httpStatus).json({
      success: false,
      errorCode: result.errorCode,
      error: result.error
    });
    return;
  }
  const participantMissions = getParticipantMissionsFromDb(currentParticipant);
  const updated = participantMissions.find((m) => m.id === id) || null;
  res.json(updated);
});
app.post("/api/missions/:id/complete", requireParticipant, (req, res) => {
  const { id } = req.params;
  const participantId = req.authSession.userId;
  const missionCheck = db.prepare("SELECT id, title, requires_evidence FROM missions WHERE id = ? LIMIT 1").get(id);
  if (missionCheck && Boolean(missionCheck.requires_evidence)) {
    res.status(400).json({
      success: false,
      status: "EVIDENCE_REQUIRED",
      error: `A miss\xE3o "${missionCheck.title}" exige o envio e a aprova\xE7\xE3o administrativa de evid\xEAncia antes da conclus\xE3o.`
    });
    return;
  }
  const result = completeSequentialMissionInSql({
    participantId,
    missionId: id,
    sourceType: "Miss\xE3o"
  });
  if (!result.ok) {
    res.status(result.httpStatus).json({
      success: false,
      status: result.status,
      alreadyCompleted: result.alreadyCompleted || false,
      error: result.message,
      message: result.message
    });
    return;
  }
  res.json({
    success: true,
    status: "VALIDATED",
    missionId: result.missionId,
    completionPointsAwarded: result.completionPointsAwarded,
    speedBonusAwarded: result.speedBonusAwarded,
    unlockPointsAwarded: result.unlockPointsAwarded,
    pointsAwarded: result.pointsAwarded,
    nextMissionUnlocked: result.nextMissionUnlocked,
    message: result.message
  });
});
app.patch("/api/missions/:id/toggle", requireAdmin, (req, res) => {
  const { id } = req.params;
  db.exec("BEGIN IMMEDIATE TRANSACTION;");
  try {
    const row = db.prepare("SELECT id, active, sequence_order FROM missions WHERE id = ?").get(id);
    if (!row) {
      db.exec("ROLLBACK;");
      res.status(404).json({ error: "Miss\xE3o n\xE3o encontrada" });
      return;
    }
    const isOfficial = row.sequence_order !== null && row.sequence_order !== void 0;
    const isStarted = hasOfficialCircuitStartedInDb(db);
    if (isStarted && isOfficial) {
      db.exec("ROLLBACK;");
      res.status(409).json({
        error: "O circuito oficial j\xE1 foi iniciado por participantes. N\xE3o \xE9 permitido ativar ou desativar miss\xF5es oficiais.",
        code: "CIRCUIT_LOCKED"
      });
      return;
    }
    const newActive = row.active === 1 ? 0 : 1;
    const newSeqOrder = newActive === 0 && isOfficial ? null : row.sequence_order;
    db.prepare("UPDATE missions SET active = ?, sequence_order = ? WHERE id = ?").run(
      newActive,
      newSeqOrder,
      id
    );
    const hasOfficial = db.prepare(
      "SELECT COUNT(*) as count FROM missions WHERE active = 1 AND sequence_order IS NOT NULL"
    ).get();
    if (hasOfficial.count > 0) {
      compactCircuitSequencesInDb(db);
      recalculateCircuitMissionPointsInDb(db);
    }
    db.exec("COMMIT;");
    const rows = db.prepare(
      "SELECT * FROM missions ORDER BY CASE WHEN sequence_order IS NOT NULL THEN 0 ELSE 1 END, sequence_order ASC, rowid ASC"
    ).all();
    res.json(rows.map(mapMissionRow));
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
});
app.delete("/api/missions/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  db.exec("BEGIN IMMEDIATE TRANSACTION;");
  try {
    const row = db.prepare("SELECT id, active, sequence_order FROM missions WHERE id = ?").get(id);
    if (!row) {
      db.exec("ROLLBACK;");
      res.status(404).json({ error: "Miss\xE3o n\xE3o encontrada" });
      return;
    }
    const isOfficial = row.sequence_order !== null && row.sequence_order !== void 0;
    const isStarted = hasOfficialCircuitStartedInDb(db);
    if (isStarted && isOfficial) {
      db.exec("ROLLBACK;");
      res.status(409).json({
        error: "O circuito oficial j\xE1 foi iniciado por participantes. A exclus\xE3o de miss\xF5es oficiais est\xE1 bloqueada.",
        code: "CIRCUIT_LOCKED"
      });
      return;
    }
    db.prepare("DELETE FROM missions WHERE id = ?").run(id);
    if (isOfficial) {
      compactCircuitSequencesInDb(db);
      const hasOfficial = db.prepare(
        "SELECT COUNT(*) as count FROM missions WHERE active = 1 AND sequence_order IS NOT NULL"
      ).get();
      if (hasOfficial.count > 0) {
        recalculateCircuitMissionPointsInDb(db);
      }
    }
    db.exec("COMMIT;");
    const rows = db.prepare(
      "SELECT * FROM missions ORDER BY CASE WHEN sequence_order IS NOT NULL THEN 0 ELSE 1 END, sequence_order ASC, rowid ASC"
    ).all();
    res.json(rows.map(mapMissionRow));
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
});
function submitEvidenceUploadInDb(targetDb, params) {
  const storageDir = params.storageDir || EVIDENCE_STORAGE_DIR;
  const missionRow = targetDb.prepare("SELECT * FROM missions WHERE id = ? AND active = 1 LIMIT 1").get(params.missionId);
  if (!missionRow) {
    return {
      ok: false,
      httpStatus: 404,
      code: "MISSION_NOT_FOUND",
      error: "Miss\xE3o n\xE3o encontrada ou inativa."
    };
  }
  if (!Boolean(missionRow.requires_evidence)) {
    return {
      ok: false,
      httpStatus: 400,
      code: "EVIDENCE_NOT_REQUIRED",
      error: "Esta miss\xE3o n\xE3o exige o envio de evid\xEAncia por arquivo."
    };
  }
  const rawEvType = String(missionRow.evidence_type || "photo").toLowerCase();
  const validEvTypes = [
    "photo",
    "print",
    "video",
    "photo_or_video",
    "text",
    "file",
    "both"
  ];
  const requiredType = validEvTypes.includes(
    rawEvType
  ) ? rawEvType : "photo";
  if (requiredType === "text") {
    return {
      ok: false,
      httpStatus: 400,
      code: "TEXT_EVIDENCE_ONLY",
      error: "Esta miss\xE3o exige resposta em texto pela rota de submiss\xE3o de texto."
    };
  }
  const maxVideoSeconds = missionRow.max_video_seconds !== null && missionRow.max_video_seconds !== void 0 ? Number(missionRow.max_video_seconds) : null;
  const isOfficial = missionRow.sequence_order !== null && missionRow.sequence_order !== void 0;
  let completionPoints = 0;
  if (isOfficial) {
    const rawComp = missionRow.completion_points;
    if (rawComp === null || rawComp === void 0 || !Number.isInteger(Number(rawComp)) || Number(rawComp) <= 0) {
      return {
        ok: false,
        httpStatus: 500,
        code: "INVALID_CIRCUIT_SCORING",
        error: `A miss\xE3o oficial "${missionRow.title}" n\xE3o possui completion_points din\xE2mico v\xE1lido no banco.`
      };
    }
    completionPoints = Number(rawComp);
  } else {
    completionPoints = Number(missionRow.points || 0);
  }
  const fileCheck = validateAndDetectEvidenceFile({
    buffer: params.buffer,
    originalName: params.originalName,
    declaredMimeType: params.declaredMimeType,
    requiredType,
    maxVideoSeconds
  });
  if (!fileCheck.ok) {
    return fileCheck;
  }
  saveEvidenceFileToDisk(params.buffer, fileCheck.storedName, storageDir);
  const newId = `val-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const evidenceCode = `EV-${Date.now().toString().slice(-6)}`;
  const nowMs = Date.now();
  const nowStr = new Date(nowMs).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  const description = (params.description || "").trim() || `Arquivo enviado: ${fileCheck.safeDisplayName}`;
  const missionTrackKey = missionRow.track_id ? String(missionRow.track_id) : "default";
  const allowSharedEvidence = Boolean(missionRow.allow_shared_evidence);
  targetDb.exec("BEGIN IMMEDIATE TRANSACTION;");
  try {
    if (isOfficial && Number(missionRow.sequence_order) > 1) {
      const seqOrder = Number(missionRow.sequence_order);
      const prevMission = targetDb.prepare(
        "SELECT id, title FROM missions WHERE COALESCE(track_id, 'default') = ? AND sequence_order = ? AND active = 1 LIMIT 1"
      ).get(missionTrackKey, seqOrder - 1);
      if (prevMission) {
        const prevCompleteTx = findActiveTransactionByEventKeys(
          params.participantId,
          [
            `COMPLETE:${params.participantId}:${prevMission.id}`,
            `COMPLETE:${params.participantId}:${prevMission.id}:POST_SIM_REV`
          ],
          targetDb
        );
        const prevPm = targetDb.prepare(
          "SELECT status FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1"
        ).get(params.participantId, prevMission.id);
        if (!prevCompleteTx && (!prevPm || prevPm.status !== "Conclu\xEDda")) {
          targetDb.exec("ROLLBACK;");
          deleteEvidenceFileIfExists(fileCheck.storedName, storageDir);
          return {
            ok: false,
            httpStatus: 403,
            code: "MISSION_LOCKED",
            error: `Bloqueio sequencial: conclua e aguarde a aprova\xE7\xE3o da Miss\xE3o 0${seqOrder - 1} antes de enviar evid\xEAncias desta miss\xE3o.`
          };
        }
      }
    }
    const existingCompleteTx = findActiveTransactionByEventKeys(
      params.participantId,
      [
        `COMPLETE:${params.participantId}:${params.missionId}`,
        `COMPLETE:${params.participantId}:${params.missionId}:POST_SIM_REV`
      ],
      targetDb
    );
    const existingPm = targetDb.prepare(
      "SELECT status, started_at_ms, target_end_at_ms FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1"
    ).get(params.participantId, params.missionId);
    const existingSubmission = targetDb.prepare(
      "SELECT id, status FROM mission_completions WHERE participant_id = ? AND mission_id = ? AND status IN ('Pendente', 'Aprovada') LIMIT 1"
    ).get(params.participantId, params.missionId);
    if (existingCompleteTx || existingPm && existingPm.status === "Conclu\xEDda" || existingSubmission) {
      targetDb.exec("ROLLBACK;");
      deleteEvidenceFileIfExists(fileCheck.storedName, storageDir);
      return {
        ok: false,
        httpStatus: 409,
        code: "EVIDENCE_ALREADY_SUBMITTED",
        error: existingSubmission?.status === "Pendente" ? "Voc\xEA j\xE1 enviou uma evid\xEAncia para esta miss\xE3o e ela est\xE1 aguardando valida\xE7\xE3o." : "Esta miss\xE3o j\xE1 foi conclu\xEDda e validada anteriormente."
      };
    }
    if (isOfficial && existingPm?.started_at_ms && existingPm?.target_end_at_ms && nowMs > Number(existingPm.target_end_at_ms)) {
      targetDb.exec("ROLLBACK;");
      deleteEvidenceFileIfExists(fileCheck.storedName, storageDir);
      return {
        ok: false,
        httpStatus: 409,
        code: "MISSION_TIMER_EXPIRED",
        error: "O tempo limite desta miss\xE3o expirou. N\xE3o \xE9 permitido enviar evid\xEAncia ap\xF3s a expira\xE7\xE3o."
      };
    }
    const sameParticipantReuse = targetDb.prepare(
      `SELECT id, mission_id, mission_title
         FROM mission_completions
         WHERE evidence_sha256 = ?
           AND participant_id = ?
           AND status IN ('Pendente', 'Aprovada')
         LIMIT 1`
    ).get(fileCheck.sha256, params.participantId);
    if (sameParticipantReuse) {
      targetDb.exec("ROLLBACK;");
      deleteEvidenceFileIfExists(fileCheck.storedName, storageDir);
      return {
        ok: false,
        httpStatus: 409,
        code: "DUPLICATE_EVIDENCE_FILE",
        error: `Este arquivo j\xE1 foi utilizado por voc\xEA na miss\xE3o "${sameParticipantReuse.mission_title}". Envie uma evid\xEAncia in\xE9dita.`
      };
    }
    const otherParticipantReuse = targetDb.prepare(
      `SELECT id, mission_id, mission_title, participant_id
         FROM mission_completions
         WHERE evidence_sha256 = ?
           AND participant_id != ?
           AND status IN ('Pendente', 'Aprovada')
         LIMIT 1`
    ).get(fileCheck.sha256, params.participantId);
    if (otherParticipantReuse) {
      const isAllowedCollectivePhoto = allowSharedEvidence && otherParticipantReuse.mission_id === String(missionRow.id);
      if (!isAllowedCollectivePhoto) {
        targetDb.exec("ROLLBACK;");
        deleteEvidenceFileIfExists(fileCheck.storedName, storageDir);
        return {
          ok: false,
          httpStatus: 409,
          code: "DUPLICATE_EVIDENCE_FILE",
          error: "Este arquivo j\xE1 foi enviado anteriormente em outra submiss\xE3o. Utilize um registro in\xE9dito para esta miss\xE3o."
        };
      }
    }
    targetDb.prepare(`
        INSERT INTO mission_completions (
          id, participant_id, participant_name, mission_id, mission_title,
          startup_id, startup_name, submitted_at, evidence_description,
          evidence_code, evidence_file_name, evidence_stored_name,
          evidence_mime_type, evidence_size_bytes, evidence_sha256,
          evidence_duration_seconds, points_awarded, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendente')
      `).run(
      newId,
      params.participantId,
      params.participantName,
      String(missionRow.id),
      String(missionRow.title),
      String(missionRow.startup_id),
      String(missionRow.startup_name),
      nowStr,
      description,
      evidenceCode,
      fileCheck.safeDisplayName,
      fileCheck.storedName,
      fileCheck.mimeType,
      fileCheck.sizeBytes,
      fileCheck.sha256,
      fileCheck.durationSeconds,
      completionPoints
    );
    if (isOfficial) {
      const frozenElapsed = existingPm?.started_at_ms ? Math.max(0, Math.round((nowMs - Number(existingPm.started_at_ms)) / 1e3)) : 0;
      targetDb.prepare(
        `UPDATE participant_missions
           SET status = 'Aguardando valida\xE7\xE3o',
               submitted_at_ms = ?,
               elapsed_seconds = ?
           WHERE participant_id = ? AND mission_id = ?`
      ).run(nowMs, frozenElapsed, params.participantId, String(missionRow.id));
    }
    targetDb.exec("COMMIT;");
  } catch (err) {
    try {
      targetDb.exec("ROLLBACK;");
    } catch {
    }
    deleteEvidenceFileIfExists(fileCheck.storedName, storageDir);
    if (String(err?.message || "").includes("UNIQUE constraint failed")) {
      return {
        ok: false,
        httpStatus: 409,
        code: "EVIDENCE_ALREADY_SUBMITTED",
        error: "Voc\xEA j\xE1 possui uma evid\xEAncia ativa ou aprovada para esta miss\xE3o."
      };
    }
    throw err;
  }
  const created = targetDb.prepare("SELECT * FROM mission_completions WHERE id = ?").get(newId);
  return {
    ok: true,
    httpStatus: 201,
    validation: mapValidationRow(created)
  };
}
var evidenceRawBodyMiddleware = express.raw({
  type: "application/octet-stream",
  limit: "26mb"
});
app.post(
  "/api/evidences/upload",
  evidenceUploadRateLimiter,
  (req, res, next) => {
    evidenceRawBodyMiddleware(req, res, (err) => {
      if (err) {
        if (err.type === "entity.too.large" || err.status === 413 || err.statusCode === 413) {
          res.status(413).json({
            error: "O arquivo excede o limite m\xE1ximo permitido de 5 MB.",
            code: "FILE_TOO_LARGE"
          });
          return;
        }
        res.status(400).json({
          error: "Falha ao processar o arquivo enviado.",
          code: "INVALID_UPLOAD_PAYLOAD"
        });
        return;
      }
      next();
    });
  },
  (req, res) => {
    const session = resolveSessionFromRequest(req);
    if (!session) {
      res.status(401).json({
        error: "N\xE3o autenticado. Fa\xE7a login para enviar evid\xEAncias.",
        code: "AUTH_REQUIRED"
      });
      return;
    }
    if (session.role !== "PARTICIPANT") {
      res.status(403).json({
        error: "Apenas participantes autenticados podem enviar evid\xEAncias de miss\xF5es.",
        code: "PARTICIPANT_ROLE_REQUIRED"
      });
      return;
    }
    const participantRow = db.prepare("SELECT * FROM participants WHERE id = ? AND UPPER(role) = 'PARTICIPANT' LIMIT 1").get(session.userId);
    if (!participantRow) {
      res.status(401).json({
        error: "Sess\xE3o de participante inv\xE1lida ou expirada.",
        code: "AUTH_REQUIRED"
      });
      return;
    }
    const currentParticipant = mapParticipantRow(participantRow);
    const headerParticipantId = String(req.headers["x-participant-id"] || "").trim();
    if (headerParticipantId && headerParticipantId !== currentParticipant.id) {
      res.status(403).json({
        error: "Opera\xE7\xE3o negada: n\xE3o \xE9 permitido enviar evid\xEAncias em nome de outro participante.",
        code: "FORBIDDEN_PARTICIPANT_MISMATCH"
      });
      return;
    }
    const missionId = String(req.headers["x-mission-id"] || "").trim();
    const rawFileNameHeader = String(req.headers["x-file-name"] || "evidencia");
    let decodedFileName = rawFileNameHeader;
    try {
      decodedFileName = decodeURIComponent(rawFileNameHeader);
    } catch {
      decodedFileName = rawFileNameHeader;
    }
    const declaredMimeType = String(req.headers["x-file-mime"] || "").trim();
    const rawDescHeader = String(req.headers["x-evidence-description"] || "");
    let decodedDesc = rawDescHeader;
    try {
      decodedDesc = decodeURIComponent(rawDescHeader);
    } catch {
      decodedDesc = rawDescHeader;
    }
    const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const result = submitEvidenceUploadInDb(db, {
      participantId: currentParticipant.id,
      participantName: currentParticipant.name,
      missionId,
      buffer,
      originalName: decodedFileName,
      declaredMimeType,
      description: decodedDesc
    });
    if (!result.ok) {
      res.status(result.httpStatus).json({
        error: result.error,
        code: result.code
      });
      return;
    }
    res.status(201).json({
      ok: true,
      validation: result.validation,
      message: "Evid\xEAncia enviada com sucesso e aguardando valida\xE7\xE3o administrativa."
    });
  }
);
app.get("/api/evidences/me", (req, res) => {
  const session = resolveSessionFromRequest(req);
  if (!session) {
    res.status(401).json({
      error: "N\xE3o autenticado. Fa\xE7a login para consultar suas evid\xEAncias.",
      code: "AUTH_REQUIRED"
    });
    return;
  }
  const rows = db.prepare("SELECT * FROM mission_completions WHERE participant_id = ? ORDER BY rowid DESC").all(session.userId);
  res.json(rows.map(mapValidationRow));
});
app.get("/api/evidences/:id/file", (req, res) => {
  const session = resolveSessionFromRequest(req);
  if (!session) {
    res.status(401).json({
      error: "N\xE3o autenticado. Fa\xE7a login para acessar evid\xEAncias.",
      code: "AUTH_REQUIRED"
    });
    return;
  }
  const { id } = req.params;
  const row = db.prepare("SELECT * FROM mission_completions WHERE id = ? LIMIT 1").get(id);
  if (!row || !row.evidence_stored_name) {
    res.status(404).json({
      error: "Arquivo de evid\xEAncia n\xE3o encontrado.",
      code: "EVIDENCE_FILE_NOT_FOUND"
    });
    return;
  }
  const isOwner = String(row.participant_id) === session.userId;
  const isAdminUser = session.role === "ADMIN";
  if (!isOwner && !isAdminUser) {
    res.status(403).json({
      error: "Acesso negado: voc\xEA s\xF3 pode consultar suas pr\xF3prias evid\xEAncias.",
      code: "FORBIDDEN_EVIDENCE_ACCESS"
    });
    return;
  }
  try {
    const filePath = resolveSafeEvidenceFilePath(String(row.evidence_stored_name));
    if (!fs4.existsSync(filePath)) {
      res.status(404).json({
        error: "Arquivo f\xEDsico de evid\xEAncia n\xE3o encontrado no servidor.",
        code: "EVIDENCE_FILE_MISSING"
      });
      return;
    }
    const mimeType = String(row.evidence_mime_type || "application/octet-stream");
    const rawDisplayName = String(row.evidence_file_name || "evidencia").replace(/[\r\n\x00-\x1f\x7f]+/g, "_").trim() || "evidencia";
    const asciiFallback = rawDisplayName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "_").replace(/["\\;]/g, "_").trim() || "evidencia";
    const encodedUtf8 = encodeURIComponent(rawDisplayName).replace(
      /['()*]/g,
      (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
    );
    const isPdf = mimeType === "application/pdf";
    res.setHeader("Content-Type", mimeType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader(
      "Content-Disposition",
      `${isPdf ? "attachment" : "inline"}; filename="${asciiFallback}"; filename*=UTF-8''${encodedUtf8}`
    );
    res.sendFile(filePath);
  } catch {
    res.status(400).json({
      error: "Refer\xEAncia de arquivo inv\xE1lida.",
      code: "INVALID_EVIDENCE_REFERENCE"
    });
  }
});
function getEnrichedAdminValidations() {
  const rows = db.prepare(`
      SELECT mc.*,
             p.image_publicity_consent AS participant_image_consent,
             p.image_publicity_consent_version AS participant_image_consent_version,
             CASE
               WHEN mc.evidence_sha256 IS NOT NULL THEN (
                 SELECT COUNT(DISTINCT mc2.participant_id)
                 FROM mission_completions mc2
                 WHERE mc2.evidence_sha256 = mc.evidence_sha256
                   AND mc2.mission_id = mc.mission_id
                   AND mc2.status IN ('Pendente', 'Aprovada')
               )
               ELSE 0
             END AS shared_evidence_count
      FROM mission_completions mc
      LEFT JOIN participants p ON p.id = mc.participant_id
      ORDER BY mc.rowid DESC
    `).all();
  return rows.map((r) => ({
    ...mapValidationRow(r),
    sharedEvidenceCount: Number(r.shared_evidence_count || 0),
    participantImageConsent: Boolean(r.participant_image_consent),
    participantImageConsentVersion: r.participant_image_consent_version ? String(r.participant_image_consent_version) : null
  }));
}
app.get("/api/validations", requireAdmin, (_req, res) => {
  res.json(getEnrichedAdminValidations());
});
app.post("/api/validations", (req, res) => {
  const session = resolveSessionFromRequest(req);
  if (!session) {
    res.status(401).json({
      error: "N\xE3o autenticado. Fa\xE7a login para enviar valida\xE7\xF5es.",
      code: "AUTH_REQUIRED"
    });
    return;
  }
  if (session.role !== "PARTICIPANT") {
    res.status(403).json({
      error: "Apenas participantes autenticados podem enviar submiss\xF5es de valida\xE7\xE3o.",
      code: "PARTICIPANT_ROLE_REQUIRED"
    });
    return;
  }
  const participantRow = db.prepare("SELECT * FROM participants WHERE id = ? AND UPPER(role) = 'PARTICIPANT' LIMIT 1").get(session.userId);
  if (!participantRow) {
    res.status(401).json({
      error: "Sess\xE3o de participante inv\xE1lida.",
      code: "AUTH_REQUIRED"
    });
    return;
  }
  const currentParticipant = mapParticipantRow(participantRow);
  const p = req.body || {};
  if (p.participantId !== void 0 && p.participantId !== null && String(p.participantId).trim() !== "" && String(p.participantId) !== currentParticipant.id) {
    res.status(403).json({
      error: "Opera\xE7\xE3o negada: n\xE3o \xE9 permitido enviar valida\xE7\xF5es em nome de outro participante.",
      code: "FORBIDDEN_PARTICIPANT_MISMATCH"
    });
    return;
  }
  const targetParticipantId = currentParticipant.id;
  const missionId = String(p.missionId || "").trim();
  ensureParticipantFirstMissionUnlockedInDb(targetParticipantId);
  const missionRow = db.prepare("SELECT * FROM missions WHERE id = ? AND active = 1 LIMIT 1").get(missionId);
  if (!missionRow) {
    res.status(404).json({ error: "Miss\xE3o n\xE3o encontrada ou inativa." });
    return;
  }
  const evType = String(missionRow.evidence_type || "").toLowerCase();
  if (Boolean(missionRow.requires_evidence) && evType !== "text") {
    res.status(400).json({
      error: `A miss\xE3o "${missionRow.title}" exige o envio de arquivo de evid\xEAncia pela rota oficial de upload.`,
      status: "EVIDENCE_REQUIRED",
      code: "EVIDENCE_REQUIRED"
    });
    return;
  }
  const rawTextEvidence = String(p.evidenceDescription || "").trim();
  if (evType === "text" && rawTextEvidence.length < 5) {
    res.status(400).json({
      error: "Escreva uma resposta em texto v\xE1lida (m\xEDnimo de 5 caracteres) para concluir esta miss\xE3o.",
      code: "TEXT_EVIDENCE_REQUIRED"
    });
    return;
  }
  const isOfficial = missionRow.sequence_order !== null && missionRow.sequence_order !== void 0;
  const missionTrackKey = missionRow.track_id ? String(missionRow.track_id) : "default";
  let completionPoints = 0;
  if (isOfficial) {
    const rawComp = missionRow.completion_points;
    if (rawComp === null || rawComp === void 0 || !Number.isInteger(Number(rawComp)) || Number(rawComp) <= 0) {
      res.status(500).json({
        error: `A miss\xE3o oficial "${missionRow.title}" n\xE3o possui completion_points din\xE2mico v\xE1lido no banco.`,
        code: "INVALID_CIRCUIT_SCORING"
      });
      return;
    }
    completionPoints = Number(rawComp);
  } else {
    completionPoints = Number(missionRow.points || 0);
  }
  const newId = `val-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const nowMs = Date.now();
  const nowStr = new Date(nowMs).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  const evidenceDescription = rawTextEvidence || "Registro enviado para valida\xE7\xE3o";
  const evidenceCode = String(p.evidenceCode || `EV-${Date.now().toString().slice(-6)}`).trim();
  db.exec("BEGIN IMMEDIATE TRANSACTION;");
  try {
    if (isOfficial && Number(missionRow.sequence_order) > 1) {
      const seqOrder = Number(missionRow.sequence_order);
      const prevMission = db.prepare(
        "SELECT id, title FROM missions WHERE COALESCE(track_id, 'default') = ? AND sequence_order = ? AND active = 1 LIMIT 1"
      ).get(missionTrackKey, seqOrder - 1);
      if (prevMission) {
        const prevCompleteTx = findActiveTransactionByEventKeys(targetParticipantId, [
          `COMPLETE:${targetParticipantId}:${prevMission.id}`,
          `COMPLETE:${targetParticipantId}:${prevMission.id}:POST_SIM_REV`
        ]);
        const prevPm = db.prepare(
          "SELECT status FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1"
        ).get(targetParticipantId, prevMission.id);
        if (!prevCompleteTx && (!prevPm || prevPm.status !== "Conclu\xEDda")) {
          db.exec("ROLLBACK;");
          res.status(403).json({
            error: `Bloqueio sequencial: conclua e aguarde a aprova\xE7\xE3o da Miss\xE3o 0${seqOrder - 1} antes de enviar evid\xEAncias desta miss\xE3o.`,
            code: "MISSION_LOCKED"
          });
          return;
        }
      }
    }
    const existingCompleteTx = findActiveTransactionByEventKeys(targetParticipantId, [
      `COMPLETE:${targetParticipantId}:${missionId}`,
      `COMPLETE:${targetParticipantId}:${missionId}:POST_SIM_REV`
    ]);
    const existingPm = db.prepare(
      "SELECT status, started_at_ms, target_end_at_ms FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1"
    ).get(targetParticipantId, missionId);
    const existingSubmission = db.prepare(
      "SELECT id, status FROM mission_completions WHERE participant_id = ? AND mission_id = ? AND status IN ('Pendente', 'Aprovada') LIMIT 1"
    ).get(targetParticipantId, missionId);
    if (existingCompleteTx || existingPm && existingPm.status === "Conclu\xEDda" || existingSubmission) {
      db.exec("ROLLBACK;");
      res.status(409).json({
        error: existingSubmission?.status === "Pendente" ? "Voc\xEA j\xE1 possui uma valida\xE7\xE3o pendente para esta miss\xE3o." : "Esta miss\xE3o j\xE1 foi conclu\xEDda e validada anteriormente.",
        code: "EVIDENCE_ALREADY_SUBMITTED"
      });
      return;
    }
    if (isOfficial && existingPm?.started_at_ms && existingPm?.target_end_at_ms && nowMs > Number(existingPm.target_end_at_ms)) {
      db.exec("ROLLBACK;");
      res.status(409).json({
        error: "O tempo limite desta miss\xE3o expirou. N\xE3o \xE9 permitido enviar evid\xEAncia ap\xF3s a expira\xE7\xE3o.",
        code: "MISSION_TIMER_EXPIRED"
      });
      return;
    }
    db.prepare(`
      INSERT INTO mission_completions (
        id, participant_id, participant_name, mission_id, mission_title,
        startup_id, startup_name, submitted_at, evidence_description,
        evidence_code, points_awarded, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendente')
    `).run(
      newId,
      targetParticipantId,
      currentParticipant.name,
      String(missionRow.id),
      String(missionRow.title),
      String(missionRow.startup_id),
      String(missionRow.startup_name),
      nowStr,
      evidenceDescription,
      evidenceCode,
      completionPoints
    );
    if (isOfficial) {
      const frozenElapsed = existingPm?.started_at_ms ? Math.max(0, Math.round((nowMs - Number(existingPm.started_at_ms)) / 1e3)) : 0;
      db.prepare(
        `UPDATE participant_missions
         SET status = 'Aguardando valida\xE7\xE3o',
             submitted_at_ms = ?,
             elapsed_seconds = ?
         WHERE participant_id = ? AND mission_id = ?`
      ).run(nowMs, frozenElapsed, targetParticipantId, String(missionRow.id));
    }
    db.exec("COMMIT;");
  } catch (err) {
    try {
      db.exec("ROLLBACK;");
    } catch {
    }
    if (String(err?.message || "").includes("UNIQUE constraint failed")) {
      res.status(409).json({
        error: "Voc\xEA j\xE1 possui uma valida\xE7\xE3o ativa ou aprovada para esta miss\xE3o.",
        code: "EVIDENCE_ALREADY_SUBMITTED"
      });
      return;
    }
    throw err;
  }
  const created = db.prepare("SELECT * FROM mission_completions WHERE id = ?").get(newId);
  res.status(201).json(mapValidationRow(created));
});
app.patch("/api/validations/:id/review", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { decision, rejectionReason } = req.body || {};
  const normalizedRejectionReason = typeof rejectionReason === "string" && rejectionReason.trim().length > 0 ? rejectionReason.trim().slice(0, 500) : null;
  if (decision !== "Aprovada" && decision !== "Rejeitada") {
    res.status(400).json({
      error: 'Decis\xE3o inv\xE1lida. Utilize "Aprovada" ou "Rejeitada".',
      code: "INVALID_DECISION"
    });
    return;
  }
  const row = db.prepare("SELECT * FROM mission_completions WHERE id = ?").get(id);
  if (!row) {
    res.status(404).json({ error: "Item de valida\xE7\xE3o n\xE3o encontrado" });
    return;
  }
  const item = mapValidationRow(row);
  if (item.status === "Aprovada") {
    res.status(409).json({
      error: "Este item de valida\xE7\xE3o j\xE1 foi aprovado anteriormente e n\xE3o pode ser alterado.",
      code: "VALIDATION_ALREADY_APPROVED"
    });
    return;
  }
  if (item.status === "Rejeitada") {
    res.status(409).json({
      error: "Este item de valida\xE7\xE3o j\xE1 foi rejeitado e n\xE3o pode ser revisado novamente.",
      code: "VALIDATION_ALREADY_REJECTED"
    });
    return;
  }
  if (decision === "Aprovada") {
    const missionRow = db.prepare("SELECT * FROM missions WHERE id = ? LIMIT 1").get(item.missionId);
    if (!missionRow) {
      res.status(404).json({ error: "Miss\xE3o associada \xE0 evid\xEAncia n\xE3o encontrada." });
      return;
    }
    const isOfficialSequential = missionRow.sequence_order !== null && missionRow.sequence_order !== void 0;
    if (isOfficialSequential) {
      const claimResult = db.prepare("UPDATE mission_completions SET status = 'Aprovada' WHERE id = ? AND status = 'Pendente'").run(id);
      if (Number(claimResult.changes) === 0) {
        const latest = db.prepare("SELECT status FROM mission_completions WHERE id = ? LIMIT 1").get(id);
        res.status(409).json({
          error: latest?.status === "Rejeitada" ? "Este item de valida\xE7\xE3o j\xE1 foi rejeitado." : "Este item de valida\xE7\xE3o j\xE1 foi revisado anteriormente.",
          code: latest?.status === "Rejeitada" ? "VALIDATION_ALREADY_REJECTED" : "VALIDATION_ALREADY_APPROVED"
        });
        return;
      }
      const seqResult = completeSequentialMissionInSql({
        participantId: item.participantId,
        missionId: item.missionId,
        sourceType: "Miss\xE3o"
      });
      if (!seqResult.ok && seqResult.httpStatus !== 409) {
        db.prepare("UPDATE mission_completions SET status = 'Pendente' WHERE id = ?").run(id);
        res.status(seqResult.httpStatus).json({ error: seqResult.message });
        return;
      }
    } else {
      db.exec("BEGIN IMMEDIATE TRANSACTION;");
      try {
        const lockedValidation = db.prepare("SELECT status FROM mission_completions WHERE id = ? LIMIT 1").get(id);
        if (!lockedValidation || lockedValidation.status !== "Pendente") {
          db.exec("ROLLBACK;");
          res.status(409).json({
            error: lockedValidation?.status === "Rejeitada" ? "Este item de valida\xE7\xE3o j\xE1 foi rejeitado." : "Este item de valida\xE7\xE3o j\xE1 foi revisado anteriormente.",
            code: lockedValidation?.status === "Rejeitada" ? "VALIDATION_ALREADY_REJECTED" : "VALIDATION_ALREADY_APPROVED"
          });
          return;
        }
        const nowMs = Date.now();
        const nowIso = new Date(nowMs).toISOString();
        const participantRow = db.prepare(
          "SELECT id, name, points, completed_missions_count, visited_startups_json FROM participants WHERE id = ? LIMIT 1"
        ).get(item.participantId);
        if (!participantRow) {
          db.exec("ROLLBACK;");
          res.status(404).json({ error: "Participante n\xE3o encontrado para aprova\xE7\xE3o." });
          return;
        }
        const baseEventKey = `COMPLETE:${item.participantId}:${item.missionId}`;
        const existingTx = findActiveTransactionByEventKeys(item.participantId, [
          baseEventKey,
          `${baseEventKey}:POST_SIM_REV`
        ]);
        const prevPoints = Number(participantRow.points || 0);
        const requestedPts = Math.max(0, Math.trunc(Number(missionRow.points || 0)));
        const reservation = calculateParticipantReservedPoints(item.participantId);
        const maxAllowedByReserve = Math.max(0, reservation.freeMargin);
        const pointsDelta = existingTx ? 0 : Math.max(0, Math.min(requestedPts, maxAllowedByReserve, MAX_PARTICIPANT_POINTS - prevPoints));
        const newPoints = prevPoints + pointsDelta;
        const existingPm = db.prepare(
          "SELECT id FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1"
        ).get(item.participantId, item.missionId);
        if (existingPm) {
          db.prepare(
            `UPDATE participant_missions
             SET status = 'Conclu\xEDda', completed_at_ms = ?, completion_points_awarded = ?, total_points_awarded = ?
             WHERE id = ?`
          ).run(nowMs, pointsDelta, pointsDelta, existingPm.id);
        } else {
          db.prepare(
            `INSERT INTO participant_missions (
               participant_id, mission_id, sequence_order, status, unlocked_at_ms, completed_at_ms,
               completion_points_awarded, total_points_awarded
             ) VALUES (?, ?, 0, 'Conclu\xEDda', ?, ?, ?, ?)`
          ).run(item.participantId, item.missionId, nowMs, nowMs, pointsDelta, pointsDelta);
        }
        if (pointsDelta > 0) {
          const eventKey = resolveNextIdempotentEventKey(item.participantId, baseEventKey);
          const visitedList = (() => {
            try {
              const parsed = JSON.parse(participantRow.visited_startups_json || "[]");
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })();
          const startupId = String(missionRow.startup_id || "");
          if (startupId && !visitedList.includes(startupId)) {
            visitedList.push(startupId);
          }
          db.prepare(
            `UPDATE participants
             SET points = ?, completed_missions_count = completed_missions_count + 1, visited_startups_json = ?
             WHERE id = ?`
          ).run(newPoints, JSON.stringify(visitedList), item.participantId);
          db.prepare(
            `INSERT INTO points_transactions (
               id, participant_id, participant_name, source_type, source_title,
               points_delta, previous_balance, new_balance, created_at, created_at_ms, event_key
             ) VALUES (?, ?, ?, 'Miss\xE3o', ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            `tx-${nowMs}-${Math.floor(Math.random() * 1e4)}`,
            item.participantId,
            participantRow.name,
            `Miss\xE3o Extra: ${String(missionRow.title || item.missionTitle)}`,
            pointsDelta,
            prevPoints,
            newPoints,
            nowIso,
            nowMs,
            eventKey
          );
        }
        db.prepare("UPDATE mission_completions SET status = 'Aprovada', points_awarded = ? WHERE id = ?").run(
          pointsDelta,
          id
        );
        db.exec("COMMIT;");
        recalculateRankingsInDb();
      } catch (err) {
        try {
          db.exec("ROLLBACK;");
        } catch {
        }
        throw err;
      }
    }
  } else {
    db.exec("BEGIN IMMEDIATE TRANSACTION;");
    try {
      const lockedValidation = db.prepare("SELECT status FROM mission_completions WHERE id = ? LIMIT 1").get(id);
      if (!lockedValidation || lockedValidation.status !== "Pendente") {
        db.exec("ROLLBACK;");
        res.status(409).json({
          error: lockedValidation?.status === "Aprovada" ? "Este item de valida\xE7\xE3o j\xE1 foi aprovado e n\xE3o pode ser convertido em rejeitado." : "Este item de valida\xE7\xE3o j\xE1 foi rejeitado anteriormente.",
          code: lockedValidation?.status === "Aprovada" ? "VALIDATION_ALREADY_APPROVED" : "VALIDATION_ALREADY_REJECTED"
        });
        return;
      }
      db.prepare(
        "UPDATE mission_completions SET status = 'Rejeitada', rejection_reason = ? WHERE id = ? AND status = 'Pendente'"
      ).run(normalizedRejectionReason, id);
      db.prepare(
        "UPDATE participant_missions SET status = 'Dispon\xEDvel', submitted_at_ms = NULL WHERE participant_id = ? AND mission_id = ? AND status != 'Conclu\xEDda'"
      ).run(item.participantId, item.missionId);
      db.exec("COMMIT;");
    } catch (err) {
      try {
        db.exec("ROLLBACK;");
      } catch {
      }
      throw err;
    }
  }
  res.json(getEnrichedAdminValidations());
});
app.get("/api/qrcodes", (_req, res) => {
  const rows = db.prepare("SELECT * FROM qr_codes").all();
  res.json(rows.map(mapQRCodeRow));
});
app.post("/api/qrcodes", requireAdmin, (req, res) => {
  const p = req.body;
  const newId = `qr-${Date.now()}`;
  const nowStr = (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR");
  db.prepare(`
    INSERT INTO qr_codes (
      id, code, label, startup_id, startup_name, mission_id,
      mission_title, points, scans_count, active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(
    newId,
    String(p.code).toUpperCase(),
    p.label,
    p.startupId,
    p.startupName,
    p.missionId,
    p.missionTitle,
    Number(p.points || 200),
    p.active === false ? 0 : 1,
    nowStr
  );
  const created = db.prepare("SELECT * FROM qr_codes WHERE id = ?").get(newId);
  res.status(201).json(mapQRCodeRow(created));
});
app.patch("/api/qrcodes/:id/toggle", requireAdmin, (req, res) => {
  const { id } = req.params;
  db.prepare("UPDATE qr_codes SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?").run(
    id
  );
  const rows = db.prepare("SELECT * FROM qr_codes").all();
  res.json(rows.map(mapQRCodeRow));
});
app.post("/api/qrcodes/scan", requireParticipant, (req, res) => {
  const { code } = req.body;
  const normalized = (code || "").trim().toUpperCase();
  if (!normalized) {
    res.status(400).json({
      success: false,
      status: "INVALID_CODE",
      message: "Informe ou escaneie um c\xF3digo QR v\xE1lido."
    });
    return;
  }
  const row = db.prepare("SELECT * FROM qr_codes WHERE UPPER(code) = ?").get(normalized);
  if (!row) {
    res.status(404).json({
      success: false,
      status: "INVALID_CODE",
      message: `C\xF3digo QR "${normalized}" inv\xE1lido ou n\xE3o localizado no banco SQLite. Verifique o totem do estande (ex.: TUTU-2026, TUTU-SIMULADOR ou FUTURIZE-2030).`
    });
    return;
  }
  const qr = mapQRCodeRow(row);
  if (!qr.active) {
    res.status(400).json({
      success: false,
      status: "INACTIVE_CODE",
      qrCode: qr,
      message: `O c\xF3digo ${qr.code} est\xE1 temporariamente desativado pela organiza\xE7\xE3o.`
    });
    return;
  }
  const missionRow = db.prepare("SELECT * FROM missions WHERE id = ?").get(qr.missionId);
  if (!missionRow) {
    res.status(400).json({
      success: false,
      status: "INVALID_MISSION",
      qrCode: qr,
      message: `O c\xF3digo ${qr.code} n\xE3o pertence a uma miss\xE3o v\xE1lida cadastrada no sistema.`
    });
    return;
  }
  const linkedMission = mapMissionRow(missionRow);
  if (!linkedMission.active) {
    res.status(400).json({
      success: false,
      status: "INVALID_MISSION",
      qrCode: qr,
      message: `A miss\xE3o "${linkedMission.title}" vinculada ao c\xF3digo ${qr.code} est\xE1 inativa no momento.`
    });
    return;
  }
  if (linkedMission.requiresEvidence) {
    res.status(400).json({
      success: false,
      status: "EVIDENCE_REQUIRED",
      qrCode: qr,
      message: `A miss\xE3o "${linkedMission.title}" exige o envio e a aprova\xE7\xE3o administrativa de evid\xEAncia pela Central de Miss\xF5es antes de liberar os pontos.`
    });
    return;
  }
  const participantId = req.authSession.userId;
  const result = completeSequentialMissionInSql({
    participantId,
    missionId: qr.missionId,
    sourceType: "QR Code",
    qrCodeRow: qr
  });
  if (!result.ok) {
    res.status(result.httpStatus).json({
      success: false,
      status: result.status,
      alreadyUsed: result.alreadyUsed || false,
      qrCode: qr,
      message: result.message
    });
    return;
  }
  const updatedRow = db.prepare("SELECT * FROM qr_codes WHERE id = ?").get(qr.id);
  res.json({
    success: true,
    status: "VALIDATED",
    qrCode: mapQRCodeRow(updatedRow),
    completionPointsAwarded: result.completionPointsAwarded,
    speedBonusAwarded: result.speedBonusAwarded,
    unlockPointsAwarded: result.unlockPointsAwarded,
    pointsAwarded: result.pointsAwarded,
    nextMissionUnlocked: result.nextMissionUnlocked,
    message: result.message
  });
});
app.get("/api/ranking/public", (req, res) => {
  const session = resolveSessionFromRequest(req);
  res.json(getPublicRankingFromDb(session?.userId));
});
app.get("/api/ranking/transactions", requireAdmin, (_req, res) => {
  const rows = db.prepare("SELECT * FROM points_transactions ORDER BY rowid DESC").all();
  res.json(rows.map(mapTransactionRow));
});
app.get("/api/ranking/reservation/:participantId", requireAdmin, (req, res) => {
  const { participantId } = req.params;
  const targetRow = db.prepare("SELECT id FROM participants WHERE id = ? LIMIT 1").get(participantId);
  if (!targetRow) {
    res.status(404).json({ error: "Participante n\xE3o encontrado." });
    return;
  }
  ensureParticipantFirstMissionUnlockedInDb(participantId);
  res.json(calculateParticipantReservedPoints(participantId));
});
app.post("/api/ranking/adjust", requireAdmin, (req, res) => {
  const { participantId, pointsDelta, reason } = req.body;
  const targetRow = db.prepare("SELECT * FROM participants WHERE id = ? LIMIT 1").get(participantId);
  if (!targetRow) {
    res.status(404).json({ error: "Participante n\xE3o encontrado." });
    return;
  }
  const currentPoints = Number(targetRow.points || 0);
  const numericDelta = Math.trunc(Number(pointsDelta) || 0);
  if (numericDelta === 0) {
    res.status(400).json({ error: "Informe um delta de pontua\xE7\xE3o diferente de zero." });
    return;
  }
  if (numericDelta > 0) {
    ensureParticipantFirstMissionUnlockedInDb(participantId);
    const reservation = calculateParticipantReservedPoints(participantId);
    if (currentPoints >= MAX_PARTICIPANT_POINTS) {
      res.status(400).json({
        error: `Limite global atingido: o participante j\xE1 possui ${MAX_PARTICIPANT_POINTS} pontos (pontua\xE7\xE3o m\xE1xima permitida).`,
        code: "MAX_POINTS_LIMIT_REACHED",
        currentPoints,
        maxPoints: MAX_PARTICIPANT_POINTS,
        reservation
      });
      return;
    }
    if (numericDelta > reservation.freeMargin) {
      res.status(400).json({
        error: `Ajuste administrativo positivo bloqueado: existem ${reservation.totalReservedPoints} pontos reservados para as miss\xF5es e b\xF4nus de velocidade planejados. Saldo livre dispon\xEDvel para ajustes: ${reservation.freeMargin} ponto(s) (m\xE1ximo permitido: +${reservation.freeMargin}).`,
        code: "POINTS_RESERVED_FOR_MISSIONS",
        currentPoints,
        totalReservedPoints: reservation.totalReservedPoints,
        freeMargin: reservation.freeMargin,
        requestedDelta: numericDelta,
        maxPoints: MAX_PARTICIPANT_POINTS,
        reservation
      });
      return;
    }
  }
  if (numericDelta < 0 && currentPoints <= 0) {
    res.status(400).json({
      error: "O participante j\xE1 possui 0 pontos. Ajustes negativos n\xE3o podem reduzir o saldo abaixo de zero.",
      code: "MIN_POINTS_LIMIT_REACHED"
    });
    return;
  }
  db.exec("BEGIN IMMEDIATE TRANSACTION;");
  try {
    creditPointsInSql({
      participantId,
      pointsDelta: numericDelta,
      sourceType: "Ajuste Administrativo",
      sourceTitle: reason || "Ajuste manual de auditoria"
    });
    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
  res.json({
    publicRanking: getPublicRankingFromDb(),
    transactions: db.prepare("SELECT * FROM points_transactions ORDER BY rowid DESC").all().map(mapTransactionRow),
    reservation: calculateParticipantReservedPoints(participantId)
  });
});
app.get("/api/ranking/daily", (req, res) => {
  const session = resolveSessionFromRequest(req);
  res.json(getDailyRankingsFromDb(db, { currentUserId: session?.userId }));
});
app.get("/api/admin/daily-awards", requireAdmin, (_req, res) => {
  res.json(getDailyRankingsFromDb(db));
});
app.get("/api/admin/metrics", requireAdmin, (_req, res) => {
  res.json(getAdminMetricsFromDb());
});
app.get("/api/admin/settings", (_req, res) => {
  const row = db.prepare("SELECT * FROM event_settings WHERE id = 1").get();
  res.json(mapEventSettingsRow(row));
});
app.put("/api/admin/settings", requireAdmin, (req, res) => {
  const row = db.prepare("SELECT * FROM event_settings WHERE id = 1").get();
  const current = mapEventSettingsRow(row);
  const u = req.body;
  const defaultTimer = u.defaultMissionTimerMinutes !== void 0 ? Math.max(
    MIN_MISSION_TIMER_MINUTES,
    Math.min(MAX_MISSION_TIMER_MINUTES, Math.trunc(Number(u.defaultMissionTimerMinutes)))
  ) : Number(row.default_mission_timer_minutes || 5);
  db.prepare(`
    UPDATE event_settings
    SET event_name = ?, dates = ?, location = ?, city = ?,
        description = ?, active_period = ?, scoring_rules_json = ?,
        tie_breaker_criteria_json = ?, rewards_enabled = ?, rewards_description = ?,
        default_mission_timer_minutes = ?
    WHERE id = 1
  `).run(
    u.eventName ?? current.eventName,
    u.dates ?? current.dates,
    u.location ?? current.location,
    u.city ?? current.city,
    u.description ?? current.description,
    u.activePeriod ?? current.activePeriod,
    JSON.stringify(u.scoringRules ?? current.scoringRules),
    JSON.stringify(u.tieBreakerCriteria ?? current.tieBreakerCriteria),
    u.rewardsEnabled ?? current.rewardsEnabled ? 1 : 0,
    u.rewardsDescription ?? current.rewardsDescription,
    defaultTimer
  );
  const updated = db.prepare("SELECT * FROM event_settings WHERE id = 1").get();
  res.json(mapEventSettingsRow(updated));
});
app.get("/api/admin/timers", requireAdmin, (_req, res) => {
  const settingsRow = db.prepare("SELECT default_mission_timer_minutes FROM event_settings WHERE id = 1 LIMIT 1").get();
  const defaultTimerMinutes = Number(settingsRow?.default_mission_timer_minutes || 5);
  const missionsRows = db.prepare(
    "SELECT id, title, sequence_order, timer_minutes FROM missions WHERE active = 1 ORDER BY CASE WHEN sequence_order IS NOT NULL THEN 0 ELSE 1 END, sequence_order ASC, rowid ASC"
  ).all();
  res.json({
    defaultTimerMinutes,
    minMinutes: MIN_MISSION_TIMER_MINUTES,
    maxMinutes: MAX_MISSION_TIMER_MINUTES,
    missions: missionsRows.map((m) => ({
      id: m.id,
      title: m.title,
      sequenceOrder: m.sequence_order,
      timerMinutes: m.timer_minutes !== null ? Number(m.timer_minutes) : null,
      effectiveTimerMinutes: m.timer_minutes !== null ? Number(m.timer_minutes) : defaultTimerMinutes,
      source: m.timer_minutes !== null ? "individual" : "global"
    }))
  });
});
app.put("/api/admin/timers", requireAdmin, (req, res) => {
  const body = req.body;
  db.exec("BEGIN IMMEDIATE TRANSACTION;");
  try {
    const isStarted = hasOfficialCircuitStartedInDb(db);
    if (body.defaultTimerMinutes !== void 0) {
      const defMin = Math.trunc(Number(body.defaultTimerMinutes));
      if (isNaN(defMin) || defMin < MIN_MISSION_TIMER_MINUTES || defMin > MAX_MISSION_TIMER_MINUTES) {
        db.exec("ROLLBACK;");
        res.status(400).json({
          error: `O tempo padr\xE3o deve ser um n\xFAmero inteiro entre ${MIN_MISSION_TIMER_MINUTES} e ${MAX_MISSION_TIMER_MINUTES} minutos.`
        });
        return;
      }
      if (isStarted) {
        const settingsRowCurrent = db.prepare("SELECT default_mission_timer_minutes FROM event_settings WHERE id = 1 LIMIT 1").get();
        const currentDef = Number(settingsRowCurrent?.default_mission_timer_minutes || 5);
        if (defMin !== currentDef) {
          const hasOfficialUsingDefault = db.prepare(
            "SELECT COUNT(*) as count FROM missions WHERE active = 1 AND sequence_order IS NOT NULL AND timer_minutes IS NULL"
          ).get();
          if (hasOfficialUsingDefault.count > 0) {
            db.exec("ROLLBACK;");
            res.status(409).json({
              error: "O circuito oficial j\xE1 foi iniciado por participantes. A altera\xE7\xE3o do tempo padr\xE3o global que afeta miss\xF5es oficiais est\xE1 bloqueada.",
              code: "CIRCUIT_LOCKED"
            });
            return;
          }
        }
      }
      db.prepare(
        "UPDATE event_settings SET default_mission_timer_minutes = ? WHERE id = 1"
      ).run(defMin);
    }
    if (body.missionTimers && typeof body.missionTimers === "object") {
      const updateMissionTimer = db.prepare("UPDATE missions SET timer_minutes = ? WHERE id = ?");
      for (const [mId, val] of Object.entries(body.missionTimers)) {
        const mMission = db.prepare("SELECT id, sequence_order, timer_minutes FROM missions WHERE id = ?").get(mId);
        if (!mMission) continue;
        const isOfficial = mMission.sequence_order !== null && mMission.sequence_order !== void 0;
        const currentVal = mMission.timer_minutes;
        const targetVal = val === null || val === void 0 || String(val) === "" ? null : Math.trunc(Number(val));
        if (isStarted && isOfficial && targetVal !== currentVal) {
          db.exec("ROLLBACK;");
          res.status(409).json({
            error: `O circuito oficial j\xE1 foi iniciado por participantes. A altera\xE7\xE3o do cron\xF4metro da miss\xE3o oficial "${mId}" est\xE1 bloqueada.`,
            code: "CIRCUIT_LOCKED"
          });
          return;
        }
        if (targetVal === null) {
          updateMissionTimer.run(null, mId);
        } else {
          if (isNaN(targetVal) || targetVal < MIN_MISSION_TIMER_MINUTES || targetVal > MAX_MISSION_TIMER_MINUTES) {
            db.exec("ROLLBACK;");
            res.status(400).json({
              error: `O tempo individual da miss\xE3o ${mId} deve estar entre ${MIN_MISSION_TIMER_MINUTES} e ${MAX_MISSION_TIMER_MINUTES} minutos (ou nulo para herdar o padr\xE3o global).`
            });
            return;
          }
          updateMissionTimer.run(targetVal, mId);
        }
      }
    }
    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
  const settingsRow = db.prepare("SELECT default_mission_timer_minutes FROM event_settings WHERE id = 1 LIMIT 1").get();
  const defaultTimerMinutes = Number(settingsRow?.default_mission_timer_minutes || 5);
  const missionsRows = db.prepare(
    "SELECT id, title, sequence_order, timer_minutes FROM missions WHERE active = 1 ORDER BY CASE WHEN sequence_order IS NOT NULL THEN 0 ELSE 1 END, sequence_order ASC, rowid ASC"
  ).all();
  res.json({
    success: true,
    message: "Configura\xE7\xF5es de cron\xF4metro atualizadas com sucesso!",
    defaultTimerMinutes,
    minMinutes: MIN_MISSION_TIMER_MINUTES,
    maxMinutes: MAX_MISSION_TIMER_MINUTES,
    missions: missionsRows.map((m) => ({
      id: m.id,
      title: m.title,
      sequenceOrder: m.sequence_order,
      timerMinutes: m.timer_minutes !== null ? Number(m.timer_minutes) : null,
      effectiveTimerMinutes: m.timer_minutes !== null ? Number(m.timer_minutes) : defaultTimerMinutes,
      source: m.timer_minutes !== null ? "individual" : "global"
    }))
  });
});
app.get("/api/admin/governance", requireAdmin, (_req, res) => {
  const rows = db.prepare("SELECT * FROM governance_plans ORDER BY code ASC").all();
  res.json(rows.map(mapGovernancePlanRow));
});
app.put("/api/admin/governance/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const row = db.prepare("SELECT * FROM governance_plans WHERE id = ?").get(id);
  if (!row) {
    res.status(404).json({ error: "Plano de governan\xE7a n\xE3o encontrado" });
    return;
  }
  const current = mapGovernancePlanRow(row);
  const u = req.body;
  db.prepare(`
    UPDATE governance_plans
    SET name = ?, objective = ?, description = ?, responsible = ?,
        indicators = ?, status = ?, related_documents_json = ?
    WHERE id = ?
  `).run(
    u.name ?? current.name,
    u.objective ?? current.objective,
    u.description ?? current.description,
    u.responsible ?? current.responsible,
    u.indicators ?? current.indicators,
    u.status ?? current.status,
    JSON.stringify(u.relatedDocuments ?? current.relatedDocuments),
    id
  );
  const rows = db.prepare("SELECT * FROM governance_plans ORDER BY code ASC").all();
  res.json(rows.map(mapGovernancePlanRow));
});
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Endpoint da API n\xE3o encontrado.", code: "API_NOT_FOUND" });
});
var DIST_DIR = path4.resolve(process.cwd(), "dist");
var DIST_INDEX_FILE = path4.join(DIST_DIR, "index.html");
if (fs4.existsSync(DIST_INDEX_FILE)) {
  app.use(express.static(DIST_DIR, { index: "index.html" }));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(DIST_INDEX_FILE);
  });
}
app.use(
  (err, _req, res, next) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    const status = typeof err?.status === "number" && err.status >= 400 && err.status < 600 ? err.status : typeof err?.statusCode === "number" && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500;
    const code = err?.code === "CORS_ORIGIN_FORBIDDEN" ? "CORS_ORIGIN_FORBIDDEN" : err?.type === "entity.too.large" || status === 413 ? "FILE_TOO_LARGE" : err?.type === "entity.parse.failed" ? "INVALID_JSON_PAYLOAD" : status >= 500 ? "INTERNAL_SERVER_ERROR" : String(err?.code || "REQUEST_ERROR");
    const safeMessage = code === "CORS_ORIGIN_FORBIDDEN" ? "Origem n\xE3o autorizada pela pol\xEDtica de CORS." : code === "FILE_TOO_LARGE" ? "O arquivo ou payload excede o limite m\xE1ximo permitido." : code === "INVALID_JSON_PAYLOAD" ? "Corpo da requisi\xE7\xE3o JSON inv\xE1lido." : status >= 500 ? "Erro interno no servidor. Tente novamente em instantes." : String(err?.message || "N\xE3o foi poss\xEDvel processar a requisi\xE7\xE3o.");
    if (status >= 500) {
      console.error(`[API Error] status=${status} code=${code} message=${err?.message || "unknown"}`);
    }
    res.status(status).json({
      error: safeMessage,
      code
    });
  }
);
var server = app.listen(PORT);
var dailyCloseTimer = null;
server.on("listening", () => {
  console.log(`[API + SQLite + RBAC] Servidor Express rodando em http://localhost:${PORT}`);
  console.log(`[API + SQLite + RBAC] Arquivo SQLite ativo: ${DB_FILE_PATH}`);
  dailyCloseTimer = setInterval(() => {
    if (isShuttingDown) return;
    try {
      const { closedDates } = ensureDailyRankingsClosedUpTo(db);
      if (closedDates.length > 0) {
        console.log(`[DailyRanking] Encerramento autom\xE1tico conclu\xEDdo para: ${closedDates.join(", ")}`);
      }
    } catch (err) {
      console.error("[DailyRanking] Erro na rotina autom\xE1tica de encerramento di\xE1rio:", err);
    }
  }, 15e3);
  dailyCloseTimer.unref();
});
var GRACEFUL_SHUTDOWN_TIMEOUT_MS = 1e4;
function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[Shutdown] Sinal ${signal} recebido. Iniciando encerramento controlado...`);
  if (dailyCloseTimer) {
    clearInterval(dailyCloseTimer);
    dailyCloseTimer = null;
  }
  const forceTimer = setTimeout(() => {
    console.error("[Shutdown] Timeout de encerramento atingido. Finalizando com fechamento do SQLite.");
    try {
      closeDatabaseGracefully();
    } finally {
      process.exit(1);
    }
  }, GRACEFUL_SHUTDOWN_TIMEOUT_MS);
  forceTimer.unref();
  server.close((closeErr) => {
    let exitCode = 0;
    if (closeErr) {
      console.error("[Shutdown] Erro ao encerrar servidor HTTP:", closeErr);
      exitCode = 1;
    }
    try {
      ensureDailyRankingsClosedUpTo(db);
    } catch (err) {
      console.error("[Shutdown] Erro ao verificar snapshots di\xE1rios no encerramento:", err);
    }
    const dbCloseResult = closeDatabaseGracefully();
    if (!dbCloseResult.closed) {
      exitCode = 1;
    }
    clearTimeout(forceTimer);
    console.log(
      `[Shutdown] Encerramento conclu\xEDdo (wal_checkpoint=${dbCloseResult.checkpointed}, db_closed=${dbCloseResult.closed}).`
    );
    process.exit(exitCode);
  });
}
process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.once("SIGINT", () => gracefulShutdown("SIGINT"));
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `[API + SQLite + RBAC] Erro EADDRINUSE: A porta ${PORT} j\xE1 est\xE1 em uso por outra inst\xE2ncia do servidor.`
    );
    console.error(
      `[API + SQLite + RBAC] Encerre o processo que ocupa a porta ${PORT} ou defina outra porta na vari\xE1vel PORT.`
    );
  } else {
    console.error(`[API + SQLite + RBAC] Falha ao iniciar o servidor HTTP na porta ${PORT}:`, err);
  }
  process.exitCode = 1;
});
export {
  normalizeAndValidateBrazilianPhone,
  registerParticipantInDb,
  resetParticipantPasswordInDb,
  submitEvidenceUploadInDb,
  updateParticipantProfileInDb
};
