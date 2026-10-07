package com.maragogi.maragobus.repository;

import com.maragogi.maragobus.entity.Advertencia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AdvertenciaRepository
        extends JpaRepository<Advertencia, UUID> {

    long countBySolicitacaoAdvertenciaAlunoId(UUID alunoId);

    List<Advertencia>
    findBySolicitacaoAdvertenciaAlunoId(UUID alunoId);
}