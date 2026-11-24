package com.maragogi.maragobus.repository;

import com.maragogi.maragobus.entity.ItemDistribuicaoTransporte;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ItemDistribuicaoTransporteRepository extends JpaRepository<ItemDistribuicaoTransporte, UUID> {

    @EntityGraph(attributePaths = {"faculdade", "motorista"})
    @Query("""
            select i from ItemDistribuicaoTransporte i
            where i.distribuicao.id = :distribuicaoId
            order by i.faculdade.nome asc, i.id asc
            """)
    List<ItemDistribuicaoTransporte> findByDistribuicaoIdOrdenado(@Param("distribuicaoId") UUID distribuicaoId);

    @Modifying(flushAutomatically = true, clearAutomatically = false)
    @Query("delete from ItemDistribuicaoTransporte i where i.distribuicao.id = :distribuicaoId")
    void deleteByDistribuicaoId(@Param("distribuicaoId") UUID distribuicaoId);
}