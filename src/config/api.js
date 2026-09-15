/**
 * Legacy API Re-export Module (Backward Compatibility Layer)
 * Todos os serviços foram refatorados para a arquitetura em camadas (src/services/ e src/domain/)
 */
export * from '../services/supabase/client';
export * from '../services/supabase/authService';
export * from '../services/supabase/chamadosService';
export * from '../services/supabase/parceirosService';
