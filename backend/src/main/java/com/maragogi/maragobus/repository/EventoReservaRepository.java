package com.maragogi.maragobus.repository;

import com.maragogi.maragobus.entity.EventoReserva;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EventoReservaRepository extends JpaRepository<EventoReserva, UUID> {

    List<EventoReserva> findByReservaIdOrderByDataHoraEventoAscIdAsc(UUID reservaId);

    Page<EventoReserva> findByAlunoIdOrderByDataHoraEventoDescIdAsc(UUID alunoId, Pageable pageable);
}