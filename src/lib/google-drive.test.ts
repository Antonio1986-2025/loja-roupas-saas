import { describe, it, expect } from "vitest";
import {
  extrairIdGoogleDrive,
  converterUrlGoogleDrive,
  fotoUrl,
} from "./google-drive";

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


describe("fotoUrl", () => {
  const ID = "1gzVszbGdZ6A9W6TEiOpr0ikbkLGxJIlH";
  const url = `https://drive.google.com/uc?export=view&id=${ID}`;

  it("retorna w200 para thumb (padrao)", () => {
    expect(fotoUrl(url)).toBe(`https://lh3.googleusercontent.com/d/${ID}=w200`);
    expect(fotoUrl(url, "thumb")).toBe(`https://lh3.googleusercontent.com/d/${ID}=w200`);
  });

  it("retorna w400 para medium", () => {
    expect(fotoUrl(url, "medium")).toBe(`https://lh3.googleusercontent.com/d/${ID}=w400`);
  });

  it("retorna w800 para full", () => {
    expect(fotoUrl(url, "full")).toBe(`https://lh3.googleusercontent.com/d/${ID}=w800`);
  });

  it("retorna null para entrada nula/vazia", () => {
    expect(fotoUrl(null)).toBeNull();
    expect(fotoUrl("")).toBeNull();
  });

  it("retorna URL local sem modificacao (upload /fotos/*.webp)", () => {
    const local = "/fotos/abc123.webp";
    expect(fotoUrl(local, "thumb")).toBe(local);
    expect(fotoUrl(local, "full")).toBe(local);
  });

  it("thumb e 4x menor que full (200 vs 800)", () => {
    const thumb = fotoUrl(url, "thumb")!;
    const full = fotoUrl(url, "full")!;
    const thumbW = parseInt(thumb.match(/=w(\d+)/)![1]);
    const fullW = parseInt(full.match(/=w(\d+)/)![1]);
    expect(fullW / thumbW).toBe(4);
  });
});
