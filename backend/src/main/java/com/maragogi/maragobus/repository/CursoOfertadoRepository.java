package com.maragogi.maragobus.repository;

import com.maragogi.maragobus.entity.CursoOfertado;
import com.maragogi.maragobus.enums.ModalidadeEnsino;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CursoOfertadoRepository extends JpaRepository<CursoOfertado, UUID> {
    List<CursoOfertado> findAllByAtivoTrue();

    List<CursoOfertado> findByFaculdadeIdAndAtivoTrue(UUID faculdadeId);

    Optional<CursoOfertado>
    findByCursoIdAndFaculdadeIdAndModalidadeEnsino(
            UUID cursoId,
            UUID faculdadeId,
            ModalidadeEnsino modalidadeEnsino
    );
}
