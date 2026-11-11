package br.com.mecanicajulio;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.core.content.FileProvider;
import androidx.webkit.WebViewAssetLoader;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * App Android da Mecânica Julio.
 *
 * Abre o site que vai empacotado dentro do APK (pasta assets/www), servido em um
 * endereço https local, então funciona sem internet e os dados ficam salvos no aparelho.
 * A ponte "AndroidApp" entrega ao Android o que o navegador faria sozinho:
 * imprimir/salvar PDF, salvar o backup e abrir WhatsApp, telefone e links externos.
 */
public class MainActivity extends Activity {

    private static final String HOST = "appassets.androidplatform.net";
    private static final String INICIO = "https://" + HOST + "/assets/www/index.html";
    private static final int PEDIDO_ARQUIVO = 42;

    private WebView web;
    private ValueCallback<Uri[]> retornoArquivo;

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);
        getWindow().setStatusBarColor(0xFF141618);
        getWindow().setNavigationBarColor(0xFF141618);

        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportMultipleWindows(false);
        s.setTextZoom(100);

        final WebViewAssetLoader carregador = new WebViewAssetLoader.Builder()
                .setDomain(HOST)
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                return carregador.shouldInterceptRequest(req.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (HOST.equals(u.getHost())) return false;
                abrirFora(u);
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> retorno, FileChooserParams params) {
                if (retornoArquivo != null) retornoArquivo.onReceiveValue(null);
                retornoArquivo = retorno;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(i, "Escolher arquivo de backup"), PEDIDO_ARQUIVO);
                } catch (ActivityNotFoundException e) {
                    retornoArquivo = null;
                    aviso("Nenhum app para escolher arquivos");
                    return false;
                }
                return true;
            }
        });

        web.addJavascriptInterface(new Ponte(), "AndroidApp");

        if (estado != null) web.restoreState(estado);
        else web.loadUrl(INICIO);
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause(); // a página fica "oculta" (usado para saber quando a impressão terminou)
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onSaveInstanceState(Bundle estado) {
        super.onSaveInstanceState(estado);
        web.saveState(estado);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        // o site guarda as janelas abertas no histórico: "voltar" fecha a janela ou volta de tela
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    @SuppressWarnings("deprecation")
    protected void onActivityResult(int pedido, int resultado, Intent dados) {
        super.onActivityResult(pedido, resultado, dados);
        if (pedido != PEDIDO_ARQUIVO || retornoArquivo == null) return;
        Uri[] escolhidos = null;
        if (resultado == RESULT_OK && dados != null && dados.getData() != null) {
            escolhidos = new Uri[] { dados.getData() };
        }
        retornoArquivo.onReceiveValue(escolhidos);
        retornoArquivo = null;
    }

    private void abrirFora(Uri u) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, u);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (ActivityNotFoundException e) {
            aviso("Nenhum app para abrir este link");
        }
    }

    private void aviso(String msg) {
        Toast.makeText(this, msg, Toast.LENGTH_LONG).show();
    }

    /** Funções chamadas pelo JavaScript do site (window.AndroidApp). */
    private class Ponte {

        @JavascriptInterface
        public void abrirExterno(final String url) {
            runOnUiThread(() -> abrirFora(Uri.parse(url)));
        }

        @JavascriptInterface
        public void imprimir(final String titulo) {
            runOnUiThread(() -> {
                PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
                if (pm == null) {
                    aviso("Impressão indisponível neste aparelho");
                    return;
                }
                PrintDocumentAdapter adaptador = web.createPrintDocumentAdapter(titulo);
                PrintAttributes atributos = new PrintAttributes.Builder()
                        .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                        .build();
                pm.print(titulo, adaptador, atributos);
            });
        }

        @JavascriptInterface
        public void salvarArquivo(final String nome, final String conteudo, final String tipo) {
            runOnUiThread(() -> {
                try {
                    File pasta = new File(getCacheDir(), "compartilhar");
                    if (!pasta.exists() && !pasta.mkdirs()) throw new Exception("sem pasta");
                    String seguro = nome.replaceAll("[^A-Za-z0-9._-]", "_");
                    File arquivo = new File(pasta, seguro);
                    try (OutputStream out = new FileOutputStream(arquivo)) {
                        out.write(conteudo.getBytes(StandardCharsets.UTF_8));
                    }
                    Uri uri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".arquivos", arquivo);
                    Intent envio = new Intent(Intent.ACTION_SEND);
                    envio.setType(tipo == null || tipo.isEmpty() ? "application/octet-stream" : tipo);
                    envio.putExtra(Intent.EXTRA_STREAM, uri);
                    envio.putExtra(Intent.EXTRA_SUBJECT, seguro);
                    envio.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(Intent.createChooser(envio, "Salvar ou enviar " + seguro));
                } catch (Exception e) {
                    aviso("Não foi possível salvar o arquivo");
                }
            });
        }
    }
}
