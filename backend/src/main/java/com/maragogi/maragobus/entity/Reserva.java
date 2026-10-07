package com.maragogi.maragobus.entity;

import com.maragogi.maragobus.enums.StatusReserva;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "reservas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reserva {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "aluno_id", nullable = false)
    private Usuario aluno;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ponto_embarque_id", nullable = false)
    private PontoEmbarque pontoEmbarque;

    @Column(name = "data_utilizacao", nullable = false)
    private LocalDate dataUtilizacao;

    @Column(name = "data_hora_reserva", nullable = false)
    private LocalDateTime dataHoraReserva;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_reserva", nullable = false, length = 30)
    @Builder.Default
    private StatusReserva statusReserva = StatusReserva.CONFIRMADA;

    @Column(name = "data_hora_cancelamento")
    private LocalDateTime dataHoraCancelamento;
}
