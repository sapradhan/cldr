package org.unicode.cldr.tool;

import java.io.File;
import java.io.IOException;
import java.io.PrintWriter;

import org.unicode.cldr.util.CLDRPaths;
import org.unicode.cldr.util.CldrUtility;
import org.unicode.cldr.util.CldrUtility.LineComparer;
import org.unicode.cldr.util.CldrUtility.SimpleLineComparator;

import com.ibm.icu.dev.util.BagFormatter;
import com.ibm.icu.dev.util.TransliteratorUtilities;

/**
 * Utilities for CLDR tools.
 * Not used in Survey Tool.
 * Moved here from CldrUtilities
 * @author srl
 *
 */
public class ToolUtilities {

    public static void registerExtraTransliterators() {
        // NOTE: UTIL_DATA_DIR is required here only because TransliteratorUtilities
        // requires a file path.
        String tzadir = CLDRPaths.UTIL_DATA_DIR + File.separatorChar; // work around bad pattern (dir+filename)
        // HACK around lack of Armenian, Ethiopic
        TransliteratorUtilities.registerTransliteratorFromFile(tzadir, "Latin-Armenian");
        // TransliteratorUtilities.registerTransliteratorFromFile(tzadir, "Latin-Ethiopic");
        TransliteratorUtilities.registerTransliteratorFromFile(tzadir, "Cyrillic-Latin");
        TransliteratorUtilities.registerTransliteratorFromFile(tzadir, "Arabic-Latin");
        // needed
        TransliteratorUtilities.registerTransliteratorFromFile(tzadir, "Thaana-Latin");
        TransliteratorUtilities.registerTransliteratorFromFile(tzadir, "Syriac-Latin");
        TransliteratorUtilities.registerTransliteratorFromFile(tzadir, "Canadian_Aboriginal-Latin");
        TransliteratorUtilities.registerTransliteratorFromFile(tzadir, "Georgian-Latin");
    
        // do nothing, too complicated to do quickly
        TransliteratorUtilities.registerTransliteratorFromFile(tzadir, "Tibetan-Latin");
        TransliteratorUtilities.registerTransliteratorFromFile(tzadir, "Khmer-Latin");
        TransliteratorUtilities.registerTransliteratorFromFile(tzadir, "Lao-Latin");
    }

    static public void generateBat(String sourceDir, String sourceFile, String targetDir, String targetFile) {
        generateBat(sourceDir, sourceFile, targetDir, targetFile, new CldrUtility.SimpleLineComparator(0));
    }

    static public void generateBat(String sourceDir, String sourceFile, String targetDir, String targetFile,
        LineComparer lineComparer) {
        try {
            String batDir = targetDir + "diff" + File.separator;
            String batName = targetFile + ".bat";
            String[] failureLines = new String[2];
    
            String fullSource = sourceDir + File.separator + sourceFile;
            String fullTarget = targetDir + File.separator + targetFile;
    
            if (!new File(sourceDir, sourceFile).exists()) {
                File f = new File(batDir, batName);
                if (f.exists()) {
                    if (DEBUG_SHOW_BAT) System.out.println("*Deleting old " + f.getCanonicalPath());
                    f.delete();
                }
            } else if (!CldrUtility.areFileIdentical(fullSource, fullTarget, failureLines, lineComparer)) {
                PrintWriter bat = BagFormatter.openUTF8Writer(batDir, batName);
                try {
                    bat.println(CLDRPaths.COMPARE_PROGRAM + " " +
                        new File(fullSource).getCanonicalPath() + " " +
                        new File(fullTarget).getCanonicalPath());
                } finally {
                    bat.close();
                }
            } else {
                File f = new File(batDir, batName);
                if (f.exists()) {
                    if (DEBUG_SHOW_BAT) System.out.println("*Deleting old:\t" + f.getCanonicalPath());
                    f.delete();
                }
                f = new File(fullTarget);
                if (BagFormatter.SHOW_FILES) System.out.println("*Deleting old:\t" + f.getCanonicalPath());
                f.delete();
            }
        } catch (IOException e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        }
    }

    static final boolean DEBUG_SHOW_BAT = false;

}
