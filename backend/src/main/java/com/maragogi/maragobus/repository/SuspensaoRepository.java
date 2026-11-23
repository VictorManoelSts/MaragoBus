package com.maragogi.maragobus.repository;

import com.maragogi.maragobus.entity.Suspensao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface SuspensaoRepository extends JpaRepository<Suspensao, UUID> {

    List<Suspensao> findByAdvertenciaOrigemSolicitacaoAdvertenciaAlunoId(UUID alunoId);

    @Query("""
            select count(s.id) > 0
            from Suspensao s
            where s.advertenciaOrigem.solicitacaoAdvertencia.aluno.id = :alunoId
              and :data between s.dataInicio and s.dataFim
            """)
    boolean existsSuspensaoVigenteParaData(@Param("alunoId") UUID alunoId, @Param("data") LocalDate data);

    @EntityGraph(attributePaths = {
            "advertenciaOrigem",
            "advertenciaOrigem.solicitacaoAdvertencia",
            "advertenciaOrigem.solicitacaoAdvertencia.aluno",
            "administradorResponsavel"
    })
    @Query("""
            select s from Suspensao s
            where s.advertenciaOrigem.solicitacaoAdvertencia.aluno.id = :alunoId
            """)
    Page<Suspensao> findByAlunoId(@Param("alunoId") UUID alunoId, Pageable pageable);

    @EntityGraph(attributePaths = {
            "advertenciaOrigem",
            "advertenciaOrigem.solicitacaoAdvertencia",
            "advertenciaOrigem.solicitacaoAdvertencia.aluno",
            "administradorResponsavel"
    })
    @Query("""
            select s from Suspensao s
            where (:apenasVigentes = false or :hoje between s.dataInicio and s.dataFim)
            """)
    Page<Suspensao> consultarTodas(@Param("apenasVigentes") boolean apenasVigentes,
                                   @Param("hoje") LocalDate hoje,
                                   Pageable pageable);
}