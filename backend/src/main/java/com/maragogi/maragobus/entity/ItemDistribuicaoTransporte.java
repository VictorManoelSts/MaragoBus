package com.maragogi.maragobus.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(
        name = "itens_distribuicao_transporte",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_item_distribuicao_faculdade",
                columnNames = {"distribuicao_id", "faculdade_id"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemDistribuicaoTransporte {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "distribuicao_id", nullable = false)
    private DistribuicaoTransporte distribuicao;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "faculdade_id", nullable = false)
    private Faculdade faculdade;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "motorista_id", nullable = false)
    private Usuario motorista;
}