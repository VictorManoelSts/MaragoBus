package com.maragogi.maragobus.repository;

import com.maragogi.maragobus.entity.Reserva;
import com.maragogi.maragobus.enums.StatusReserva;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;
import com.maragogi.maragobus.repository.projection.ResumoReservasPorFaculdadePonto;
import com.maragogi.maragobus.dto.reserva.PassageiroConfirmadoResponse;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReservaRepository extends JpaRepository<Reserva, UUID> {

    @Query("""
            select count(r.id) from Reserva r
            left join PerfilAluno perfil on perfil.usuario = r.aluno
            left join perfil.cursoOfertado oferta
            left join oferta.faculdade f
            where r.dataUtilizacao = :data and r.statusReserva = :status and f.id is null
            """)
    long contarReservasSemFaculdade(@Param("data") LocalDate data, @Param("status") StatusReserva status);

    @Query(value = """
            select new com.maragogi.maragobus.dto.reserva.PassageiroConfirmadoResponse(
                r.id, aluno.id, aluno.nome, r.dataUtilizacao, f.id, f.nome, ponto.id, ponto.nome)
            from Reserva r join r.aluno aluno join r.pontoEmbarque ponto
            left join PerfilAluno perfil on perfil.usuario = aluno
            left join perfil.cursoOfertado oferta left join oferta.faculdade f
            where r.dataUtilizacao = :data and r.statusReserva = :status
                and (:faculdadeId is null or f.id = :faculdadeId)
                and (:pontoId is null or ponto.id = :pontoId)
            order by aluno.nome asc, r.id asc
            """, countQuery = """
            select count(r.id)
            from Reserva r join r.aluno aluno join r.pontoEmbarque ponto
            left join PerfilAluno perfil on perfil.usuario = aluno
            left join perfil.cursoOfertado oferta left join oferta.faculdade f
            where r.dataUtilizacao = :data and r.statusReserva = :status
                and (:faculdadeId is null or f.id = :faculdadeId)
                and (:pontoId is null or ponto.id = :pontoId)
            """)
    Page<PassageiroConfirmadoResponse> consultarPassageirosConfirmados(
            @Param("data") LocalDate data, @Param("status") StatusReserva status,
            @Param("faculdadeId") UUID faculdadeId, @Param("pontoId") UUID pontoId, Pageable pageable);

    @Query("""
            select new com.maragogi.maragobus.repository.projection.ResumoReservasPorFaculdadePonto(
                f.id, f.nome, ponto.id, ponto.nome, count(r.id))
            from Reserva r
            left join PerfilAluno perfil on perfil.usuario = r.aluno
            left join perfil.cursoOfertado oferta
            left join oferta.faculdade f
            join r.pontoEmbarque ponto
            where r.dataUtilizacao = :data and r.statusReserva = :status
            group by f.id, f.nome, ponto.id, ponto.nome
            order by f.nome asc, f.id asc, ponto.nome asc, ponto.id asc
            """)
    List<ResumoReservasPorFaculdadePonto> resumirPorFaculdadeEPonto(
            @Param("data") LocalDate data, @Param("status") StatusReserva status);

    @EntityGraph(attributePaths = {"aluno", "pontoEmbarque"})
    Page<Reserva> findByAlunoId(UUID alunoId, Pageable pageable);

    @EntityGraph(attributePaths = {"aluno", "pontoEmbarque"})
    Optional<Reserva>
    findByAlunoIdAndDataUtilizacaoAndStatusReserva(
            UUID alunoId,
            LocalDate dataUtilizacao,
            StatusReserva statusReserva
    );

    boolean existsByAlunoIdAndDataUtilizacaoAndStatusReserva(
            UUID alunoId,
            LocalDate dataUtilizacao,
            StatusReserva statusReserva
    );

    List<Reserva> findByAlunoIdOrderByDataUtilizacaoDesc(UUID alunoId);

    interface CandidataFechamento {
        UUID getReservaId();
        UUID getAlunoId();
    }

    @Query("""
            select r.id as reservaId, r.aluno.id as alunoId
            from Reserva r
            where r.dataUtilizacao = :data and r.statusReserva = :status and r.pontoEmbarque.ativo = false
            """)
    List<CandidataFechamento> buscarParaFechamentoPorPontoInativo(
            @Param("data") LocalDate data, @Param("status") StatusReserva status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Reserva> findLockedById(UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<Reserva> findByDataUtilizacaoAndStatusReservaOrderById(
            LocalDate dataUtilizacao,
            StatusReserva statusReserva
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<Reserva> findByAlunoIdAndStatusReservaAndDataUtilizacaoBetweenOrderById(
            UUID alunoId,
            StatusReserva statusReserva,
            LocalDate dataInicio,
            LocalDate dataFim
    );
}
