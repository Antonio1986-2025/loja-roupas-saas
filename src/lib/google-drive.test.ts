import { describe, it, expect } from "vitest";
import { extrairIdGoogleDrive, converterUrlGoogleDrive } from "./google-drive";

const ID = "1gzVszbGdZ6A9W6TEiOpr0ikbkLGxJIlH";

describe("extrairIdGoogleDrive", () => {
  it("extrai do formato uc?export=view&id=", () => {
    expect(extrairIdGoogleDrive(`https://drive.google.com/uc?export=view&id=${ID}`)).toBe(ID);
  });

  it("extrai do formato uc?id=", () => {
    expect(extrairIdGoogleDrive(`https://drive.google.com/uc?id=${ID}`)).toBe(ID);
  });

  it("extrai do formato /file/d/ID/view", () => {
    expect(extrairIdGoogleDrive(`https://drive.google.com/file/d/${ID}/view`)).toBe(ID);
  });

  it("extrai do formato /d/ID (lh3)", () => {
    expect(extrairIdGoogleDrive(`https://lh3.googleusercontent.com/d/${ID}=w800`)).toBe(ID);
  });

  it("retorna null para vazio/nulo/indefinido", () => {
    expect(extrairIdGoogleDrive(null)).toBeNull();
    expect(extrairIdGoogleDrive(undefined)).toBeNull();
    expect(extrairIdGoogleDrive("")).toBeNull();
  });

  it("retorna null quando nao ha ID (ex: nome de arquivo solto)", () => {
    expect(extrairIdGoogleDrive("CM023.jpeg")).toBeNull();
  });
});

describe("converterUrlGoogleDrive", () => {
  it("converte uc?export=view para o formato CDN lh3 com largura padrao 800", () => {
    expect(converterUrlGoogleDrive(`https://drive.google.com/uc?export=view&id=${ID}`)).toBe(
      `https://lh3.googleusercontent.com/d/${ID}=w800`
    );
  });

  it("respeita a largura customizada", () => {
    expect(converterUrlGoogleDrive(`https://drive.google.com/uc?id=${ID}`, 400)).toBe(
      `https://lh3.googleusercontent.com/d/${ID}=w400`
    );
  });

  it("e idempotente: uma URL lh3 ja convertida continua valida", () => {
    const jaConvertida = `https://lh3.googleusercontent.com/d/${ID}=w800`;
    expect(converterUrlGoogleDrive(jaConvertida)).toBe(jaConvertida);
  });

  it("retorna null para entrada nula/vazia", () => {
    expect(converterUrlGoogleDrive(null)).toBeNull();
    expect(converterUrlGoogleDrive("")).toBeNull();
  });

  it("retorna a URL original quando nao consegue extrair ID", () => {
    expect(converterUrlGoogleDrive("CM023.jpeg")).toBe("CM023.jpeg");
  });
});