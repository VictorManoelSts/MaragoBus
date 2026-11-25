-- Executar uma vez no PostgreSQL existente antes de iniciar a nova versão.
-- O projeto usa ddl-auto=update e não executa este script automaticamente.
BEGIN;

ALTER TABLE suspensoes
    ADD COLUMN status varchar(20) NOT NULL DEFAULT 'APLICADA',
    ADD COLUMN justificativa varchar(500),
    ALTER COLUMN duracao DROP NOT NULL,
    ALTER COLUMN data_inicio DROP NOT NULL,
    ALTER COLUMN data_fim DROP NOT NULL,
    ALTER COLUMN administrador_responsavel_id DROP NOT NULL,
    ALTER COLUMN data_hora_aplicacao DROP NOT NULL;

ALTER TABLE suspensoes ALTER COLUMN status DROP DEFAULT;
ALTER TABLE advertencias ADD COLUMN suspensao_id uuid REFERENCES suspensoes(id);

-- A advertência de origem identifica o fechamento de cada ciclo no modelo antigo.
UPDATE advertencias a SET suspensao_id = s.id
FROM suspensoes s WHERE a.id = s.advertencia_origem_id;

-- Vincula as duas primeiras advertências restantes de cada ciclo por ordem de aprovação.
WITH ciclos AS (
    SELECT s.id, sa.aluno_id, sa.data_hora_analise,
           row_number() OVER (PARTITION BY sa.aluno_id
                              ORDER BY s.data_hora_aplicacao, s.id) AS numero
    FROM suspensoes s
    JOIN advertencias a ON a.id = s.advertencia_origem_id
    JOIN solicitacoes_advertencia sa ON sa.id = a.solicitacao_advertencia_id
), advertencias_sem_origem AS (
    SELECT a.id, sa.aluno_id, sa.data_hora_analise,
           row_number() OVER (PARTITION BY sa.aluno_id
                              ORDER BY sa.data_hora_analise, a.id) AS numero
    FROM advertencias a
    JOIN solicitacoes_advertencia sa ON sa.id = a.solicitacao_advertencia_id
    WHERE a.suspensao_id IS NULL AND sa.status = 'APROVADA'
)
UPDATE advertencias a SET suspensao_id = c.id
FROM advertencias_sem_origem av
JOIN ciclos c ON c.aluno_id = av.aluno_id AND c.numero = (av.numero + 1) / 2
             AND av.data_hora_analise <= c.data_hora_analise
WHERE a.id = av.id;

COMMIT;
