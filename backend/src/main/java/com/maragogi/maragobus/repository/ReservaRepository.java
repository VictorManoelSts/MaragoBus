package com.maragogi.maragobus.repository;

import com.maragogi.maragobus.entity.Reserva;
import com.maragogi.maragobus.enums.StatusReserva;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReservaRepository extends JpaRepository<Reserva, UUID> {

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

    List<Reserva> findByDataUtilizacaoAndStatusReserva(
            LocalDate dataUtilizacao,
            StatusReserva statusReserva
    );
}
