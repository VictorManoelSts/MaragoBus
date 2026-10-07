package com.maragogi.maragobus.repository;

import com.maragogi.maragobus.entity.SolicitacaoAdvertencia;
import com.maragogi.maragobus.enums.StatusSolicitacaoAdvertencia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SolicitacaoAdvertenciaRepository
        extends JpaRepository<SolicitacaoAdvertencia, UUID> {

    List<SolicitacaoAdvertencia>
    findByStatus(StatusSolicitacaoAdvertencia status);

    List<SolicitacaoAdvertencia>
    findByAlunoIdOrderByDataHoraSolicitacaoDesc(UUID alunoId);

    List<SolicitacaoAdvertencia>
    findByMotoristaSolicitanteIdOrderByDataHoraSolicitacaoDesc(
            UUID motoristaId
    );
}