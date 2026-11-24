package com.maragogi.maragobus.repository;

import com.maragogi.maragobus.entity.DistribuicaoTransporte;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface DistribuicaoTransporteRepository extends JpaRepository<DistribuicaoTransporte, UUID> {

    @EntityGraph(attributePaths = {"ultimoEditor", "publicadoPor"})
    Optional<DistribuicaoTransporte> findByDataUtilizacao(LocalDate dataUtilizacao);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from DistribuicaoTransporte d where d.dataUtilizacao = :dataUtilizacao")
    Optional<DistribuicaoTransporte> findByDataUtilizacaoComLock(@Param("dataUtilizacao") LocalDate dataUtilizacao);
}