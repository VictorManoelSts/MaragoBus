package com.maragogi.maragobus.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "advertencias")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Advertencia {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "solicitacao_advertencia_id", nullable = false, unique = true)
    private SolicitacaoAdvertencia solicitacaoAdvertencia;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "suspensao_id")
    private Suspensao suspensao;
}
