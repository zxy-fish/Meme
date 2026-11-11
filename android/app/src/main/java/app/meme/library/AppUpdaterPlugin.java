package app.meme.library;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

/**
 * In-app update for the Android build.
 *
 * The web layer asks the GitHub REST API which release is newest and hands us an
 * asset URL plus its sha256; we download it (following the API redirect to
 * release-assets.githubusercontent.com), verify the digest, check that the APK
 * belongs to this package, then hand it to the system installer through the
 * FileProvider that Capacitor's template already declares.
 */
@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    private static final String USER_AGENT = "Meme-Updater";
    private static final int CONNECT_TIMEOUT = 20_000;
    private static final int READ_TIMEOUT = 60_000;

    @PluginMethod
    public void canInstall(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("value", canRequestInstall());
        call.resolve(ret);
    }

    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent =
                new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        final String url = call.getString("url");
        final String sha256 = call.getString("sha256");
        final String fileName = call.getString("fileName", "Meme-update.apk");
        if (url == null || url.isEmpty()) {
            call.reject("缺少下载地址");
            return;
        }

        final Context ctx = getContext();
        if (!canRequestInstall()) {
            call.reject("需要先允许 Meme 安装未知来源应用");
            return;
        }

        call.setKeepAlive(true);
        new Thread(
            () -> {
                File apk = new File(ctx.getCacheDir(), fileName);
                try {
                    download(url, apk, sha256);
                    String pkg = apkPackageName(ctx, apk);
                    if (!ctx.getPackageName().equals(pkg)) {
                        //noinspection ResultOfMethodCallIgnored
                        apk.delete();
                        reject(call, "安装包不是 Meme，已取消更新");
                        return;
                    }
                    notifyListeners("state", state("installing"));
                    launchInstaller(ctx, apk);
                    resolve(call);
                } catch (Exception error) {
                    //noinspection ResultOfMethodCallIgnored
                    apk.delete();
                    String message = error.getMessage();
                    reject(call, message == null || message.isEmpty() ? "更新失败" : message);
                }
            },
            "meme-apk-download"
        )
            .start();
    }

    private void download(String url, File dest, String expectedSha) throws Exception {
        HttpURLConnection connection = null;
        String current = url;
        for (int hop = 0; hop < 6; hop++) {
            connection = (HttpURLConnection) new URL(current).openConnection();
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(CONNECT_TIMEOUT);
            connection.setReadTimeout(READ_TIMEOUT);
            connection.setRequestProperty("User-Agent", USER_AGENT);
            connection.setRequestProperty("Accept", "application/octet-stream");
            int code = connection.getResponseCode();
            if (code == 301 || code == 302 || code == 303 || code == 307 || code == 308) {
                String location = connection.getHeaderField("Location");
                connection.disconnect();
                if (location == null) throw new IllegalStateException("下载重定向异常");
                current = location;
                continue;
            }
            if (code != 200) throw new IllegalStateException("下载失败（HTTP " + code + "）");
            break;
        }

        long total = connection.getContentLengthLong();
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream in = connection.getInputStream(); FileOutputStream out = new FileOutputStream(dest)) {
            byte[] buffer = new byte[64 * 1024];
            long received = 0;
            int lastPercent = -1;
            int read;
            while ((read = in.read(buffer)) > 0) {
                out.write(buffer, 0, read);
                digest.update(buffer, 0, read);
                received += read;
                if (total > 0) {
                    int percent = (int) (received * 100 / total);
                    if (percent != lastPercent) {
                        lastPercent = percent;
                        JSObject progress = new JSObject();
                        progress.put("percent", Math.min(99, percent));
                        notifyListeners("progress", progress);
                    }
                }
            }
        } finally {
            connection.disconnect();
        }

        if (expectedSha != null && !expectedSha.isEmpty()) {
            String actual = toHex(digest.digest());
            if (!actual.equalsIgnoreCase(expectedSha)) {
                //noinspection ResultOfMethodCallIgnored
                dest.delete();
                throw new IllegalStateException("安装包校验失败，请重试");
            }
        }
    }

    private String apkPackageName(Context ctx, File apk) {
        PackageManager pm = ctx.getPackageManager();
        PackageInfo info = pm.getPackageArchiveInfo(apk.getAbsolutePath(), 0);
        return info == null ? null : info.packageName;
    }

    private void launchInstaller(Context ctx, File apk) {
        Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", apk);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        ctx.startActivity(intent);
    }

    private boolean canRequestInstall() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return getContext().getPackageManager().canRequestPackageInstalls();
        }
        return true;
    }

    private JSObject state(String status) {
        JSObject ret = new JSObject();
        ret.put("status", status);
        return ret;
    }

    private void resolve(PluginCall call) {
        if (getActivity() == null) {
            call.resolve();
            return;
        }
        getActivity().runOnUiThread(call::resolve);
    }

    private void reject(PluginCall call, String message) {
        if (getActivity() == null) {
            call.reject(message);
            return;
        }
        getActivity().runOnUiThread(() -> call.reject(message));
    }

    private static String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(Character.forDigit((b >> 4) & 0xF, 16));
            sb.append(Character.forDigit(b & 0xF, 16));
        }
        return sb.toString();
    }
}
