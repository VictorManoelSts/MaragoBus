# MaragoBus

PWA de reserva de vagas em transporte universitário da Prefeitura de Maragogi.

---

## Pré-requisitos

Instale o [Docker Desktop](https://www.docker.com/products/docker-desktop) para o seu sistema operacional:

- **Mac:** [Docker Desktop para Mac](https://docs.docker.com/desktop/install/mac-install/)
- **Windows:** [Docker Desktop para Windows](https://docs.docker.com/desktop/install/windows-install/)
- **Linux:** [Docker Desktop para Linux](https://docs.docker.com/desktop/install/linux-install/)

Após instalar, certifique-se de que o Docker está rodando antes de prosseguir.

---

## Configuração inicial

Copie o arquivo de variáveis de ambiente:

```bash
cp .env.example .env
```

Preencha as variáveis do Firebase no arquivo `.env`.

---

## Iniciar o ambiente

```bash
docker-compose up
```

Aguarde os dois containers subirem. O container `firebase` inicia os emuladores e o container `app` inicia o servidor Vite.

---

## Acessar o app

Abra o navegador em:

```
http://localhost:5173
```

---

## Parar o ambiente

```bash
docker-compose down
```

---

## Portas utilizadas

| Serviço | Porta |
|---|---|
| App (Vite) | 5173 |
| Firebase Emulator UI | 4000 |
| Firestore | 8080 |
| Auth | 9099 |
| Functions | 5001 |
| Storage | 9199 |
