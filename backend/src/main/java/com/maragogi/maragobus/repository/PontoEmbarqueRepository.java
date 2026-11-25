package com.maragogi.maragobus.repository;

import com.maragogi.maragobus.entity.PontoEmbarque;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PontoEmbarqueRepository extends JpaRepository<PontoEmbarque, UUID> {

    Optional<PontoEmbarque> findByNome(String nome);

    boolean existsByNome(String nome);

    List<PontoEmbarque> findByAtivoTrue();

    Page<PontoEmbarque> findByAtivoTrue(Pageable pagina);
}
