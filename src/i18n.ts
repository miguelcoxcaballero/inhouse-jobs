import type { Language } from './types';

const messages = {
  es: {
    discover: 'Buscar', swipe: 'Descubrir', saved: 'Guardados', activity: 'Actividad', profile: 'Perfil',
    headline: 'Encuentra tu próximo trabajo', searchPlaceholder: 'Puesto, habilidad o empresa', locationPlaceholder: 'Ciudad o ubicación',
    filters: 'Filtros', all: 'Todos', remote: 'Remoto', hybrid: 'Híbrido', onsite: 'Presencial',
    results: 'ofertas', updated: 'Actualizado', cached: 'Datos guardados', save: 'Guardar', apply: 'Solicitar',
    details: 'Ver detalles', dismiss: 'Descartar', undo: 'Deshacer', noJobs: 'No hay ofertas con estos filtros.',
    adjust: 'Cambiar filtros', swipeTitle: 'Modo swipe', swipeHelp: 'Derecha para guardar · izquierda para descartar',
    noMore: 'Has revisado todas las ofertas disponibles.', profileTitle: 'Tu perfil de candidatura', localOnly: 'Guardado únicamente en este dispositivo',
    fullName: 'Nombre completo', email: 'Email', phone: 'Teléfono', city: 'Ciudad', linkedin: 'LinkedIn', website: 'Web o portfolio',
    skills: 'Habilidades', authorization: 'Permiso de trabajo', coverLetter: 'Plantilla de carta de presentación', cv: 'Currículum',
    chooseCv: 'Seleccionar CV', savedLocally: 'Guardado localmente', assistant: 'Preparar candidatura',
    assistantCopy: 'Revisa los datos antes de abrir el formulario. Inhouse intentará rellenar los campos compatibles; tú decides cuándo enviarlo.',
    missingProfile: 'Completa al menos tu nombre y email para mejorar el autorrelleno.', openApplication: 'Abrir y rellenar',
    markSubmitted: 'Marcar como enviada', prepared: 'Preparada', submitted: 'Enviada', interview: 'Entrevista', rejected: 'Rechazada', archived: 'Archivada',
    activeFilters: 'Filtros activos', employment: 'Contrato', country: 'País', posted: 'Publicada', salaryOnly: 'Solo con salario',
    anyTime: 'Cualquier fecha', day1: 'Últimas 24 horas', days7: 'Últimos 7 días', days30: 'Últimos 30 días',
    language: 'Idioma', theme: 'Tema', dark: 'Oscuro', light: 'Claro', privacy: 'Privacidad y datos', deleteData: 'Borrar mis datos locales',
  },
  en: {
    discover: 'Search', swipe: 'Discover', saved: 'Saved', activity: 'Activity', profile: 'Profile',
    headline: 'Find your next job', searchPlaceholder: 'Role, skill or company', locationPlaceholder: 'City or location',
    filters: 'Filters', all: 'All', remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site',
    results: 'jobs', updated: 'Updated', cached: 'Saved data', save: 'Save', apply: 'Apply',
    details: 'View details', dismiss: 'Dismiss', undo: 'Undo', noJobs: 'No jobs match these filters.',
    adjust: 'Adjust filters', swipeTitle: 'Swipe mode', swipeHelp: 'Right to save · left to dismiss',
    noMore: 'You have reviewed every available job.', profileTitle: 'Your application profile', localOnly: 'Stored only on this device',
    fullName: 'Full name', email: 'Email', phone: 'Phone', city: 'City', linkedin: 'LinkedIn', website: 'Website or portfolio',
    skills: 'Skills', authorization: 'Work authorization', coverLetter: 'Cover letter template', cv: 'CV / résumé',
    chooseCv: 'Choose CV', savedLocally: 'Saved locally', assistant: 'Prepare application',
    assistantCopy: 'Review your details before opening the form. Inhouse will fill compatible fields; you decide when to submit it.',
    missingProfile: 'Add at least your name and email for better autofill.', openApplication: 'Open and fill',
    markSubmitted: 'Mark as submitted', prepared: 'Prepared', submitted: 'Submitted', interview: 'Interview', rejected: 'Rejected', archived: 'Archived',
    activeFilters: 'Active filters', employment: 'Employment', country: 'Country', posted: 'Posted', salaryOnly: 'Salary shown only',
    anyTime: 'Any time', day1: 'Past 24 hours', days7: 'Past 7 days', days30: 'Past 30 days',
    language: 'Language', theme: 'Theme', dark: 'Dark', light: 'Light', privacy: 'Privacy and data', deleteData: 'Delete my local data',
  },
} as const;

export type MessageKey = keyof typeof messages.en;
export const getMessages = (language: Language) => messages[language];
