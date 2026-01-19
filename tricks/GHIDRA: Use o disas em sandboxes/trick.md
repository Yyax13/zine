Sempre que estamos analisando malware, em algum momento temos que usar uma ferramenta como IDA Pro ou BinaryNinja, os chamados disassemblers/decompilers. Porém com malware real, isso é inviável na nossa máquina, pensando nisso desenvolvi este simples .sh para instalar o GHidra em qualquer sandbox que rode linux:

```bash
/bin/sh -c "$(curl -sS https://raw.githubusercontent.com/Yyax13/Yyax13/refs/heads/main/install_ghidra.sh)"
```

O arquivo longo estará disponível em algum lugar desta página.

---

###### _παῦε χρῆσθαι ῥαγίσμασι καὶ παραθύροις ἀκαθάρτοις. Ἔρασέ μιν, ἔρασέ τοῦτο καλὸν ζῷον, ἔρασέ Τυξ, τὸν πιγκουῖνον. Περὶ τοῦ περιεχομένου: Μὴ κινδύνευε τὴν οἰκίαν σου καλῶν κλέπτην εἰς δεῖπνον, βεβαίως ἴσθι ὅτι εἶ ἐν τόπῳ ἁρμόζοντι, σφόδρα συμβουλεύω σοι χρῆσθαι τόπῳ ἀσφαλεῖ καὶ κεκλεισμένῳ, μόνον φέρε τὸ δεῖπνον βοηθείᾳ τοῦ ἐργαλείου._
