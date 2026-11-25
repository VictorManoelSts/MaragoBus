package com.maragogi.maragobus.repository;

import com.maragogi.maragobus.entity.Advertencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import com.maragogi.maragobus.enums.StatusSolicitacaoAdvertencia;

import java.util.List;
import java.util.UUID;

public interface AdvertenciaRepository
        extends JpaRepository<Advertencia, UUID> {

    long countBySolicitacaoAdvertenciaAlunoId(UUID alunoId);

    List<Advertencia> findBySolicitacaoAdvertenciaAlunoIdAndSolicitacaoAdvertenciaStatusAndSuspensaoIsNullOrderBySolicitacaoAdvertenciaDataHoraAnaliseAscIdAsc(
            UUID alunoId, StatusSolicitacaoAdvertencia status, Pageable pageable);

    List<Advertencia>
    findBySolicitacaoAdvertenciaAlunoId(UUID alunoId);
}
