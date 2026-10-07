package com.maragogi.maragobus.enums;

public enum DuracaoSuspensao {
    UM_DIA(1),
    TRES_DIAS(3),
    CINCO_DIAS(5);

    private final int dias;

    DuracaoSuspensao(int dias) {
        this.dias = dias;
    }

    public int getDias() {
        return dias;
    }
}
