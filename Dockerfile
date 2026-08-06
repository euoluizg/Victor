FROM node:18-alpine

# Cria o diretório da aplicação
WORKDIR /usr/src/app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências de produção
RUN npm install

# Copia os arquivos do projeto
COPY . .

# Expõe a porta que o bot irá escutar
EXPOSE 8080

# Comando para iniciar a aplicação
CMD [ "npm", "start" ]
