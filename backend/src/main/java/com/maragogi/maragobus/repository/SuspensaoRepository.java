package com.maragogi.maragobus.repository;

import com.maragogi.maragobus.entity.Suspensao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SuspensaoRepository
        extends JpaRepository<Suspensao, UUID> {

    List<Suspensao>
    findByAdvertenciaOrigemSolicitacaoAdvertenciaAlunoId(
            UUID alunoId
    );
}