import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { recalculateCircuitMissionPointsInDb } from '../db/circuitScoring';

export interface OfficialStartupSeed {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  category: string;
  solutionPresentation: string;
  boothNumber: string;
  logoText: string;
  website?: string;
  instagramUrl: string;
  logoPath: string;
}

export interface OfficialMissionSeed {
  id: string;
  trackId: 'ex_devedor' | 'sign' | 'editora_escreva' | 'bonus';
  sequenceOrder: number;
  title: string;
  description: string;
  completionCriteria: string;
  startupId: string;
  startupName: string;
  category: 'Visitação' | 'Experimentação' | 'Compartilhamento' | 'Bônus' | 'Missão surpresa';
  relativeWeight: number;
  timerMinutes: number;
  estimatedTime: string;
  requiresEvidence: boolean;
  evidenceType: 'photo' | 'print' | 'video' | 'photo_or_video' | 'text';
  maxVideoSeconds?: number | null;
  allowSharedEvidence?: boolean;
  active: boolean;
  externalLink?: string | null;
}

export const OFFICIAL_STARTUPS_2026: OfficialStartupSeed[] = [
  {
    id: 'st-ex-devedor-2026',
    name: 'Ex Devedor',
    shortName: 'Ex Devedor',
    tagline: 'Educação financeira, tecnologia e autonomia com o assistente inteligente Tutu.',
    description:
      'A Ex Devedor é uma escola de educação financeira que transforma a relação das pessoas com o dinheiro por meio da educação, tecnologia e mudança de comportamento.\n\nCriamos o Tutu, nosso assistente financeiro inteligente, que ajuda a organizar o orçamento, acompanhar metas e tomar decisões mais conscientes. Nosso objetivo vai além de sair das dívidas: é conquistar autonomia financeira e evitar novas recaídas.',
    category: 'Educação Financeira & IA',
    solutionPresentation:
      'Conheça o Tutu, assistente financeiro inteligente para organização do orçamento, acompanhamento de metas e decisões financeiras conscientes.',
    boothNumber: 'Espaço Ex Devedor • Global Summit 2026',
    logoText: 'EXDEV',
    website: 'https://tutu.exdevedor.com/login',
    instagramUrl: 'https://www.instagram.com/exdevedor/',
    logoPath: '/images/startups/ex-devedor.png',
  },
  {
    id: 'st-sign-2026',
    name: 'Sign',
    shortName: 'Sign',
    tagline: 'Aprendizagem interativa de Libras com reconhecimento de movimentos no dispositivo.',
    description:
      'A Sign é uma plataforma de aprendizagem de Libras que torna o ensino mais interativo, como em um aplicativo de idiomas. Utiliza a câmera do dispositivo para acompanhar 21 pontos de cada mão e comparar os movimentos com os de pessoas fluentes em Libras. O reconhecimento acontece no próprio dispositivo, sem que o vídeo precise sair dele.',
    category: 'Acessibilidade & EdTech',
    solutionPresentation:
      'Plataforma interativa de Libras com acompanhamento de 21 pontos em cada mão diretamente no dispositivo, com total privacidade.',
    boothNumber: 'Espaço Sign • Global Summit 2026',
    logoText: 'SIGN',
    instagramUrl: 'https://www.instagram.com/signedu/',
    logoPath: '/images/startups/sign.png',
  },
  {
    id: 'st-editora-escreva-2026',
    name: 'Editora Escreva',
    shortName: 'Editora Escreva',
    tagline: 'Toda grande história começa com uma ideia. E a próxima pode ser sua!',
    description:
      'A Editora Escreva acredita no poder das histórias e da escrita para transformar ideias em conhecimento e experiências. Incentiva novos autores e conecta escritores ao universo da publicação de livros, oferecendo caminhos para que suas histórias cheguem aos leitores.\n\nToda grande história começa com uma ideia. E a próxima pode ser sua!',
    category: 'Publicação & Cultura',
    solutionPresentation:
      'Incentivo a novos autores e caminhos completos para transformar ideias em livros publicados que chegam aos leitores.',
    boothNumber: 'Espaço Editora Escreva • Global Summit 2026',
    logoText: 'ESCREVA',
    instagramUrl: 'https://www.instagram.com/editoraescreva/',
    logoPath: '/images/startups/editora-escreva.png',
  },
];

export const OFFICIAL_MISSIONS_2026: OfficialMissionSeed[] = [
  // ==================== TRILHA 1: EX DEVEDOR ====================
  {
    id: 'ms-2026-exdev-01',
    trackId: 'ex_devedor',
    sequenceOrder: 1,
    title: 'Caçador de oportunidades',
    description:
      'Encontre o espaço da Ex Devedor no Global Summit e registre sua visita com uma foto.',
    completionCriteria: 'Evidência obrigatória: foto da visita ao espaço da Ex Devedor.',
    startupId: 'st-ex-devedor-2026',
    startupName: 'Ex Devedor',
    category: 'Visitação',
    relativeWeight: 10,
    timerMinutes: 2,
    estimatedTime: '2 min',
    requiresEvidence: true,
    evidenceType: 'photo',
    active: true,
  },
  {
    id: 'ms-2026-exdev-02',
    trackId: 'ex_devedor',
    sequenceOrder: 2,
    title: 'Experimente o Tutu',
    description:
      'Conheça nosso assistente financeiro inteligente. Acesse a plataforma, faça seu cadastro e descubra como o Tutu pode ajudar na sua organização financeira.',
    completionCriteria:
      'Evidência obrigatória: print da confirmação do cadastro. Restrição: não envie prints que exponham dados financeiros ou informações pessoais sensíveis.',
    startupId: 'st-ex-devedor-2026',
    startupName: 'Ex Devedor',
    category: 'Experimentação',
    relativeWeight: 30,
    timerMinutes: 7,
    estimatedTime: '7 min',
    requiresEvidence: true,
    evidenceType: 'print',
    externalLink: 'https://tutu.exdevedor.com/login',
    active: true,
  },
  {
    id: 'ms-2026-exdev-03',
    trackId: 'ex_devedor',
    sequenceOrder: 3,
    title: 'Tutu na prática',
    description:
      'Faça uma pergunta ao Tutu sobre organização financeira. Depois, conte qual foi sua pergunta e o que aprendeu com a resposta.',
    completionCriteria:
      'Evidência obrigatória: resposta em texto relatando sua pergunta ao Tutu e o que aprendeu.',
    startupId: 'st-ex-devedor-2026',
    startupName: 'Ex Devedor',
    category: 'Experimentação',
    relativeWeight: 20,
    timerMinutes: 4,
    estimatedTime: '4 min',
    requiresEvidence: true,
    evidenceType: 'text',
    active: true,
  },

  // ==================== TRILHA 2: SIGN ====================
  {
    id: 'ms-2026-sign-01',
    trackId: 'sign',
    sequenceOrder: 1,
    title: 'Conexão que transforma',
    description:
      'Encontre o espaço da Sign, conheça a solução e registre sua visita com uma foto.',
    completionCriteria: 'Evidência obrigatória: foto da visita ao espaço da Sign.',
    startupId: 'st-sign-2026',
    startupName: 'Sign',
    category: 'Visitação',
    relativeWeight: 10,
    timerMinutes: 2,
    estimatedTime: '2 min',
    requiresEvidence: true,
    evidenceType: 'photo',
    active: true,
  },
  {
    id: 'ms-2026-sign-02',
    trackId: 'sign',
    sequenceOrder: 2,
    title: 'Meu nome em Libras',
    description:
      'Com a ajuda da equipe da Sign, aprenda a representar seu nome em Libras e demonstre o que aprendeu.',
    completionCriteria:
      'Evidência obrigatória: foto ou vídeo demonstrando a representação do seu nome em Libras.',
    startupId: 'st-sign-2026',
    startupName: 'Sign',
    category: 'Experimentação',
    relativeWeight: 30,
    timerMinutes: 5,
    estimatedTime: '5 min',
    requiresEvidence: true,
    evidenceType: 'photo_or_video',
    active: true,
  },
  {
    id: 'ms-2026-sign-03',
    trackId: 'sign',
    sequenceOrder: 3,
    title: 'Desafio das mãos',
    description:
      'Aprenda uma nova palavra em Libras com a equipe da Sign e desafie outra pessoa a reproduzi-la!\n\nGrave um vídeo mostrando você apresentando e ensinando o sinal aprendido, enquanto a outra pessoa tenta reproduzi-lo.',
    completionCriteria:
      'Evidência obrigatória: vídeo de até 60 segundos (MP4, MOV ou WEBM). Não é permitida substituição por foto ou texto.',
    startupId: 'st-sign-2026',
    startupName: 'Sign',
    category: 'Experimentação',
    relativeWeight: 25,
    timerMinutes: 5,
    estimatedTime: '5 min',
    requiresEvidence: true,
    evidenceType: 'video',
    maxVideoSeconds: 60,
    active: true,
  },

  // ==================== TRILHA 3: EDITORA ESCREVA ====================
  {
    id: 'ms-2026-escreva-01',
    trackId: 'editora_escreva',
    sequenceOrder: 1,
    title: 'Uma história começa aqui',
    description:
      'Encontre o espaço da Editora Escreva, conheça a startup e registre sua visita com uma foto.',
    completionCriteria: 'Evidência obrigatória: foto da visita ao espaço da Editora Escreva.',
    startupId: 'st-editora-escreva-2026',
    startupName: 'Editora Escreva',
    category: 'Visitação',
    relativeWeight: 10,
    timerMinutes: 2,
    estimatedTime: '2 min',
    requiresEvidence: true,
    evidenceType: 'photo',
    active: true,
  },
  {
    id: 'ms-2026-escreva-02',
    trackId: 'editora_escreva',
    sequenceOrder: 2,
    title: 'Autor por um minuto',
    description:
      'Imagine que você vai publicar seu próprio livro. Qual seria o título e sobre o que ele falaria?',
    completionCriteria:
      'Evidência obrigatória: resposta em texto informando o título e a sinopse do seu livro.',
    startupId: 'st-editora-escreva-2026',
    startupName: 'Editora Escreva',
    category: 'Experimentação',
    relativeWeight: 25,
    timerMinutes: 4,
    estimatedTime: '4 min',
    requiresEvidence: true,
    evidenceType: 'text',
    active: true,
  },
  {
    id: 'ms-2026-escreva-03',
    trackId: 'editora_escreva',
    sequenceOrder: 3,
    title: 'Desperte o escritor',
    description:
      'Crie uma frase que poderia abrir o primeiro capítulo do livro que você gostaria de escrever.',
    completionCriteria:
      'Evidência obrigatória: resposta em texto com a frase de abertura do primeiro capítulo.',
    startupId: 'st-editora-escreva-2026',
    startupName: 'Editora Escreva',
    category: 'Experimentação',
    relativeWeight: 25,
    timerMinutes: 4,
    estimatedTime: '4 min',
    requiresEvidence: true,
    evidenceType: 'text',
    active: true,
  },

  // ==================== TRILHA 4: MISSÕES BÔNUS ====================
  {
    id: 'ms-2026-bonus-01',
    trackId: 'bonus',
    sequenceOrder: 1,
    title: 'Networking que rende',
    description:
      'Conheça alguém no evento que ainda não faça parte do seu círculo de contatos. Convide essa pessoa para conhecer uma das três startups e tirem uma foto juntos no espaço da startup escolhida.',
    completionCriteria:
      'Evidência obrigatória: foto dos dois participantes juntos no espaço de uma das três startups.',
    startupId: 'st-ex-devedor-2026',
    startupName: 'Missões Bônus',
    category: 'Bônus',
    relativeWeight: 40,
    timerMinutes: 5,
    estimatedTime: '5 min',
    requiresEvidence: true,
    evidenceType: 'photo',
    active: true,
  },
  {
    id: 'ms-2026-bonus-02',
    trackId: 'bonus',
    sequenceOrder: 2,
    title: 'Influenciador por um dia',
    description:
      'Grave um vídeo de até 15 segundos contando qual solução mais chamou sua atenção durante a dinâmica. Publique nos Stories do Instagram e marque os três perfis das startups (@exdevedor, @signedu e @editoraescreva).',
    completionCriteria:
      'Evidência obrigatória: print do Story publicado marcando @exdevedor, @signedu e @editoraescreva (ou o próprio vídeo publicado de até 15 segundos).',
    startupId: 'st-ex-devedor-2026',
    startupName: 'Missões Bônus',
    category: 'Compartilhamento',
    relativeWeight: 35,
    timerMinutes: 10,
    estimatedTime: '10 min',
    requiresEvidence: true,
    evidenceType: 'photo_or_video',
    maxVideoSeconds: 15,
    active: true,
  },
  {
    id: 'ms-2026-bonus-03',
    trackId: 'bonus',
    sequenceOrder: 3,
    title: 'Trio de inovação',
    description:
      'Encontre os três representantes das startups e tire uma foto com todos juntos em um único registro.\n\nAtenção: é necessário que os três representantes estejam juntos na mesma foto. Não vale tirar fotos separadas com um representante de cada startup.',
    completionCriteria:
      'Evidência obrigatória: uma foto inédita feita especificamente para esta missão com os três representantes juntos.',
    startupId: 'st-ex-devedor-2026',
    startupName: 'Missões Bônus',
    category: 'Bônus',
    relativeWeight: 40,
    timerMinutes: 7,
    estimatedTime: '7 min',
    requiresEvidence: true,
    evidenceType: 'photo',
    allowSharedEvidence: true,
    active: true,
  },
  {
    id: 'ms-2026-bonus-04',
    trackId: 'bonus',
    sequenceOrder: 4,
    title: 'Espalhe a novidade',
    description:
      'Publique um Story mostrando sua participação no Global Summit e na dinâmica das startups. Marque os três perfis oficiais (@exdevedor, @signedu e @editoraescreva).',
    completionCriteria:
      'Evidência obrigatória: print do Story publicado marcando @exdevedor, @signedu e @editoraescreva.',
    startupId: 'st-ex-devedor-2026',
    startupName: 'Missões Bônus',
    category: 'Compartilhamento',
    relativeWeight: 25,
    timerMinutes: 7,
    estimatedTime: '7 min',
    requiresEvidence: true,
    evidenceType: 'print',
    active: true,
  },
  {
    id: 'ms-2026-bonus-05',
    trackId: 'bonus',
    sequenceOrder: 5,
    title: 'Conecte-se com as startups',
    description:
      'Siga os três perfis oficiais no Instagram (@exdevedor, @signedu e @editoraescreva) e envie um print que demonstre que está seguindo todos eles.',
    completionCriteria:
      'Evidência obrigatória: um print mostrando os três perfis oficiais seguidos no Instagram.',
    startupId: 'st-ex-devedor-2026',
    startupName: 'Missões Bônus',
    category: 'Compartilhamento',
    relativeWeight: 30,
    timerMinutes: 5,
    estimatedTime: '5 min',
    requiresEvidence: true,
    evidenceType: 'print',
    active: true,
  },
];

function ensureCatalogColumns(database: DatabaseSync): void {
  const ensureCol = (table: string, col: string, def: string) => {
    const cols = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some((c) => c.name.toLowerCase() === col.toLowerCase())) {
      database.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def};`);
    }
  };

  ensureCol('startups', 'instagram_url', 'TEXT');
  ensureCol('startups', 'logo_path', 'TEXT');
  ensureCol('missions', 'unlock_points', 'INTEGER NOT NULL DEFAULT 20');
  ensureCol('missions', 'completion_points', 'INTEGER NOT NULL DEFAULT 180');
  ensureCol('missions', 'max_speed_bonus', 'INTEGER NOT NULL DEFAULT 50');
  ensureCol('missions', 'sequence_order', 'INTEGER');
  ensureCol('missions', 'timer_minutes', 'INTEGER');
  ensureCol('missions', 'requires_evidence', 'INTEGER NOT NULL DEFAULT 0');
  ensureCol('missions', 'evidence_type', 'TEXT');
  ensureCol('missions', 'track_id', 'TEXT');
  ensureCol('missions', 'relative_weight', 'INTEGER NOT NULL DEFAULT 10');
  ensureCol('missions', 'max_video_seconds', 'INTEGER');
  ensureCol('missions', 'allow_shared_evidence', 'INTEGER NOT NULL DEFAULT 0');
  ensureCol('missions', 'is_surprise', 'INTEGER NOT NULL DEFAULT 0');
  ensureCol('missions', 'external_link', 'TEXT');
  ensureCol('participant_missions', 'submitted_at_ms', 'INTEGER');
  ensureCol('mission_completions', 'rejection_reason', 'TEXT');
  ensureCol('mission_completions', 'evidence_duration_seconds', 'INTEGER');
  ensureCol('participants', 'image_publicity_consent_version', 'TEXT');
}

export function seedOfficialCatalog2026InDb(database: DatabaseSync) {
  ensureCatalogColumns(database);

  database.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    // 1. Desativa startups legadas SEM excluir registros históricos
    const officialStartupIds = OFFICIAL_STARTUPS_2026.map((s) => s.id);
    const startupPlaceholders = officialStartupIds.map(() => '?').join(', ');
    database
      .prepare(`UPDATE startups SET active = 0 WHERE id NOT IN (${startupPlaceholders})`)
      .run(...officialStartupIds);

    // 2. Upsert das 3 startups oficiais
    const upsertStartup = database.prepare(`
      INSERT INTO startups (
        id, name, short_name, tagline, description, category,
        solution_presentation, booth_number, logo_text, available_points,
        active, is_configurable_guest, website, instagram_url, logo_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 0, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        short_name = excluded.short_name,
        tagline = excluded.tagline,
        description = excluded.description,
        category = excluded.category,
        solution_presentation = excluded.solution_presentation,
        booth_number = excluded.booth_number,
        logo_text = excluded.logo_text,
        active = 1,
        is_configurable_guest = 0,
        website = excluded.website,
        instagram_url = excluded.instagram_url,
        logo_path = excluded.logo_path
    `);

    for (const st of OFFICIAL_STARTUPS_2026) {
      upsertStartup.run(
        st.id,
        st.name,
        st.shortName,
        st.tagline,
        st.description,
        st.category,
        st.solutionPresentation,
        st.boothNumber,
        st.logoText,
        st.website || null,
        st.instagramUrl,
        st.logoPath
      );
    }

    // 3. Desativa missões legadas SEM excluir registros históricos nem alterar transações/validações antigas
    const officialMissionIds = OFFICIAL_MISSIONS_2026.map((m) => m.id);
    const missionPlaceholders = officialMissionIds.map(() => '?').join(', ');
    database
      .prepare(
        `UPDATE missions SET active = 0, sequence_order = NULL WHERE id NOT IN (${missionPlaceholders})`
      )
      .run(...officialMissionIds);

    // 4. Upsert das 14 missões oficiais (4 trilhas independentes)
    const upsertMission = database.prepare(`
      INSERT INTO missions (
        id, title, description, startup_id, startup_name, category,
        points, unlock_points, completion_points, max_speed_bonus,
        sequence_order, track_id, relative_weight, estimated_time,
        status, period, completion_criteria, active,
        qr_code_required, quiz_questions_json, timer_minutes,
        requires_evidence, evidence_type, max_video_seconds,
        allow_shared_evidence, external_link
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?, ?, ?, ?, '24 a 26/11/2026', ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        startup_id = excluded.startup_id,
        startup_name = excluded.startup_name,
        category = excluded.category,
        sequence_order = excluded.sequence_order,
        track_id = excluded.track_id,
        relative_weight = excluded.relative_weight,
        estimated_time = excluded.estimated_time,
        status = excluded.status,
        completion_criteria = excluded.completion_criteria,
        active = excluded.active,
        timer_minutes = excluded.timer_minutes,
        requires_evidence = excluded.requires_evidence,
        evidence_type = excluded.evidence_type,
        max_video_seconds = excluded.max_video_seconds,
        allow_shared_evidence = excluded.allow_shared_evidence,
        external_link = excluded.external_link
    `);

    for (const m of OFFICIAL_MISSIONS_2026) {
      upsertMission.run(
        m.id,
        m.title,
        m.description,
        m.startupId,
        m.startupName,
        m.category,
        m.sequenceOrder,
        m.trackId,
        m.relativeWeight,
        m.estimatedTime,
        m.sequenceOrder === 1 ? 'Disponível' : 'Bloqueada',
        m.completionCriteria,
        m.active ? 1 : 0,
        m.timerMinutes,
        m.requiresEvidence ? 1 : 0,
        m.evidenceType,
        m.maxVideoSeconds ?? null,
        m.allowSharedEvidence ? 1 : 0,
        m.externalLink ?? null
      );
    }

    // 5. Recalcula a partição dinâmica ponderada dos 1.000 pontos entre as 14 missões ativas
    const scoringResult = recalculateCircuitMissionPointsInDb(database);

    // 6. Sincroniza available_points de cada startup com o total potencial de sua trilha
    const trackToStartup: Record<string, string> = {
      ex_devedor: 'st-ex-devedor-2026',
      sign: 'st-sign-2026',
      editora_escreva: 'st-editora-escreva-2026',
    };
    for (const [trackId, startupId] of Object.entries(trackToStartup)) {
      const sumRow = database
        .prepare(
          `SELECT COALESCE(SUM(unlock_points + completion_points + max_speed_bonus), 0) AS total
           FROM missions
           WHERE track_id = ? AND active = 1`
        )
        .get(trackId) as { total: number };
      database
        .prepare('UPDATE startups SET available_points = ? WHERE id = ?')
        .run(Number(sumRow.total || 0), startupId);
    }

    database.exec('COMMIT;');
    return {
      ok: true,
      startupsCount: OFFICIAL_STARTUPS_2026.length,
      missionsCount: OFFICIAL_MISSIONS_2026.length,
      activeMissionsCount: scoringResult.missionCount,
      scoringSummary: scoringResult.summary,
      updatedMissions: scoringResult.updatedMissions,
    };
  } catch (err) {
    try {
      database.exec('ROLLBACK;');
    } catch {
      // ignora
    }
    throw err;
  }
}

// Execução direta via CLI (com trava de segurança contra execução acidental em produção)
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const defaultProdDb = path.resolve(path.dirname(__filename), '../db/desafio_global.sqlite');
  const targetDbPath = process.env.DESAFIO_DB_PATH
    ? path.resolve(process.env.DESAFIO_DB_PATH)
    : defaultProdDb;

  const isProdTarget = targetDbPath.toLowerCase() === defaultProdDb.toLowerCase();
  const hasExplicitConfirm = process.argv.includes('--confirm-production');

  if (isProdTarget && !hasExplicitConfirm) {
    console.error(
      '[BLOQUEADO] Para proteger o banco de produção, execute primeiro em uma cópia via DESAFIO_DB_PATH=... ou passe --confirm-production após autorização expressa.'
    );
    process.exit(1);
  }

  const db = new DatabaseSync(targetDbPath);
  try {
    const result = seedOfficialCatalog2026InDb(db);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    db.close();
  }
}
