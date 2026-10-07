package com.maragogi.maragobus.entity;

import com.maragogi.maragobus.enums.DuracaoSuspensao;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "suspensoes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Suspensao {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "advertencia_origem_id", nullable = false, unique = true)
    private Advertencia advertenciaOrigem;

    @Enumerated(EnumType.STRING)
    @Column(name = "duracao", nullable = false, length = 20)
    private DuracaoSuspensao duracao;

    @Column(name = "data_inicio", nullable = false)
    private LocalDate dataInicio;

    @Column(name = "data_fim", nullable = false)
    private LocalDate dataFim;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "administrador_responsavel_id", nullable = false)
    private Usuario administradorResponsavel;

    @Column(name = "data_hora_aplicacao", nullable = false)
    private LocalDateTime dataHoraAplicacao;
}
