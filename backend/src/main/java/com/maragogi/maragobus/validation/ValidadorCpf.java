package com.maragogi.maragobus.validation;

public final class ValidadorCpf {

    private ValidadorCpf() {
    }

    public static boolean ehValido(String cpf) {

        if (cpf == null || !cpf.matches("\\d{11}")) {
            return false;
        }

        if (cpf.chars().distinct().count() == 1) {
            return false;
        }

        int primeiroDigito = calcularDigito(cpf, 9);
        int segundoDigito = calcularDigito(cpf, 10);

        return primeiroDigito == cpf.charAt(9) - '0'
                && segundoDigito == cpf.charAt(10) - '0';
    }

    private static int calcularDigito(
            String cpf,
            int quantidadeDigitos
    ) {
        int soma = 0;

        for (int i = 0; i < quantidadeDigitos; i++) {
            int numero = cpf.charAt(i) - '0';
            int peso = quantidadeDigitos + 1 - i;

            soma += numero * peso;
        }

        int resto = soma % 11;
        int digito = 11 - resto;

        return digito >= 10 ? 0 : digito;
    }
}