package KuHub.utils;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;

public class ImagenUtils {

    /**
     * Valida que los bytes correspondan a una imagen real (JPG, PNG, etc.)
     */
    public static boolean esImagenValida(byte[] fotoBytes) {
        try {
            BufferedImage imagen = ImageIO.read(new ByteArrayInputStream(fotoBytes));
            return imagen != null;
        } catch (Exception e) {
            return false;
        }
    }
}