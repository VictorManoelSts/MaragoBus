package com.maragogi.maragobus.repository;

import com.maragogi.maragobus.entity.HistoricoDistribuicaoTransporte;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface HistoricoDistribuicaoTransporteRepository extends JpaRepository<HistoricoDistribuicaoTransporte, UUID> {

    @EntityGraph(attributePaths = {"motoristaResponsavel"})
    @Query(value = """
            select h from HistoricoDistribuicaoTransporte h
            where h.distribuicao.id = :distribuicaoId
            order by h.numeroRevisao desc, h.dataHora desc, h.id asc
            """, countQuery = """
            select count(h.id) from HistoricoDistribuicaoTransporte h
            where h.distribuicao.id = :distribuicaoId
            """)
    Page<HistoricoDistribuicaoTransporte> findByDistribuicaoId(@Param("distribuicaoId") UUID distribuicaoId, Pageable pageable);
}