package com.maragogi.maragobus.repository;

import com.maragogi.maragobus.entity.DataSemFuncionamento;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface DataSemFuncionamentoRepository extends JpaRepository<DataSemFuncionamento, UUID> {
    // Locks transacionais do calendário. Decisões de suspensão podem lê-lo em paralelo.
    @Query(value = "select 1 from pg_advisory_xact_lock_shared(80721, 1)", nativeQuery = true)
    int bloquearCalendarioParaLeitura();

    @Query(value = "select 1 from pg_advisory_xact_lock(80721, 1)", nativeQuery = true)
    int bloquearCalendarioParaAlteracao();

    boolean existsByData(LocalDate data);

    Optional<DataSemFuncionamento> findByData(LocalDate data);

    @Query("select d.data from DataSemFuncionamento d where d.data between :inicio and :fim")
    Set<LocalDate> findDatasNoPeriodo(@Param("inicio") LocalDate inicio, @Param("fim") LocalDate fim);

    @Query("select d.data from DataSemFuncionamento d where d.data >= :inicio")
    Set<LocalDate> findDatasAPartirDe(@Param("inicio") LocalDate inicio);

    @Query(value = "select d from DataSemFuncionamento d join fetch d.administradorResponsavel",
            countQuery = "select count(d) from DataSemFuncionamento d")
    Page<DataSemFuncionamento> findAllComAdministrador(Pageable pageable);
}