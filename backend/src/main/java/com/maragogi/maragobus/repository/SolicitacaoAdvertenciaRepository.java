package com.maragogi.maragobus.repository;

import com.maragogi.maragobus.entity.SolicitacaoAdvertencia;
import com.maragogi.maragobus.enums.StatusSolicitacaoAdvertencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.maragogi.maragobus.dto.solicitacaoadvertencia.SolicitacaoAdvertenciaPendenteResponse;

import java.util.List;
import java.util.UUID;
import java.util.Optional;

public interface SolicitacaoAdvertenciaRepository
        extends JpaRepository<SolicitacaoAdvertencia, UUID> {

    // Decisões administrativas devem adquirir este lock antes de verificar o status.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from SolicitacaoAdvertencia s where s.id = :id")
    Optional<SolicitacaoAdvertencia> findByIdParaAnalise(@Param("id") UUID id);

    @Query(value = """
            select new com.maragogi.maragobus.dto.solicitacaoadvertencia.SolicitacaoAdvertenciaPendenteResponse(
                s.id, aluno.id, aluno.nome, motorista.id, motorista.nome,
                s.descricao, s.dataHoraSolicitacao, s.status)
            from SolicitacaoAdvertencia s join s.aluno aluno join s.motoristaSolicitante motorista
            where s.status = :status
            order by s.dataHoraSolicitacao asc, s.id asc
            """, countQuery = """
            select count(s.id) from SolicitacaoAdvertencia s where s.status = :status
            """)
    Page<SolicitacaoAdvertenciaPendenteResponse> consultarPorStatus(
            @Param("status") StatusSolicitacaoAdvertencia status, Pageable pageable);

    List<SolicitacaoAdvertencia>
    findByStatus(StatusSolicitacaoAdvertencia status);

    List<SolicitacaoAdvertencia>
    findByAlunoIdOrderByDataHoraSolicitacaoDesc(UUID alunoId);

    List<SolicitacaoAdvertencia>
    findByMotoristaSolicitanteIdOrderByDataHoraSolicitacaoDesc(
            UUID motoristaId
    );
}
