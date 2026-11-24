package com.maragogi.maragobus.repository;

import com.maragogi.maragobus.entity.AvisoAdministrativo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface AvisoAdministrativoRepository extends JpaRepository<AvisoAdministrativo, UUID> {

    @EntityGraph(attributePaths = {"faculdadeDestino", "administradorResponsavel", "arquivadoPor"})
    @Query("select a from AvisoAdministrativo a where a.id = :id")
    Optional<AvisoAdministrativo> findByIdComDetalhes(@Param("id") UUID id);

    @EntityGraph(attributePaths = {"faculdadeDestino", "administradorResponsavel", "arquivadoPor"})
    @Query(value = """
            select a from AvisoAdministrativo a
            where (:incluirArquivados = true or a.arquivado = false)
            order by a.dataHoraPublicacao desc, a.id asc
            """, countQuery = """
            select count(a.id) from AvisoAdministrativo a
            where (:incluirArquivados = true or a.arquivado = false)
            """)
    Page<AvisoAdministrativo> findParaAdministracao(@Param("incluirArquivados") boolean incluirArquivados, Pageable pageable);

    @EntityGraph(attributePaths = {"faculdadeDestino", "administradorResponsavel"})
    @Query(value = """
            select a from AvisoAdministrativo a
            where a.arquivado = false
              and (a.escopo = com.maragogi.maragobus.enums.EscopoAviso.GERAL
                   or a.faculdadeDestino.id = :faculdadeId)
            order by a.dataHoraPublicacao desc, a.id asc
            """, countQuery = """
            select count(a.id) from AvisoAdministrativo a
            where a.arquivado = false
              and (a.escopo = com.maragogi.maragobus.enums.EscopoAviso.GERAL
                   or a.faculdadeDestino.id = :faculdadeId)
            """)
    Page<AvisoAdministrativo> findVisiveisParaFaculdade(@Param("faculdadeId") UUID faculdadeId, Pageable pageable);
}