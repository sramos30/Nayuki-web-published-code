import java.io.*;
import java.util.StringTokenizer;


// DWITE - October 2005 - Problem 3: Sum 'Em Up
public class dwite200510p3 {
	
	public static void main(BufferedReader in, PrintWriter out) throws IOException {
		for (int i = 0; i < 5; i++)
			mainOnce(in, out);
	}
	
	static void mainOnce(BufferedReader in, PrintWriter out) throws IOException {
		StringTokenizer st = new StringTokenizer(in.readLine(), " ");
		int a = Integer.parseInt(st.nextToken());
		int b = Integer.parseInt(st.nextToken());
		if (a > b) {  // Let a be smaller than or equal to b
			int tp = a;
			a = b;
			b = tp;
		}
		
		// Compute the sum 'a + a+1 + a+2 + ... + b-2 + b-1 + b' in closed form
		int sum = b*(b+1)/2 - a*(a-1)/2;  // Alternatively, (b-a+1)*a + (b-a)*(b-a+1)/2
		
		// Build the summation expression
		StringBuffer sb = new StringBuffer();
		for (; a <= b; a++) {
			sb.append(a);
			if (a != b)
				sb.append("+");
		}
		
		out.printf("%s=%d%n", sb, sum);
	}
	
	
	static String infile = "DATA31.txt";  // Specify null to use System.in
	static String outfile = "OUT31.txt";  // Specify null to use System.out
	
	public static void main(String[] args) throws IOException {
		InputStream in0;
		if (infile != null) in0 = new FileInputStream(infile);
		else in0 = System.in;
		Reader in1 = new InputStreamReader(in0, "US-ASCII");
		BufferedReader in = new BufferedReader(in1);
		
		OutputStream out0;
		if (outfile != null) out0 = new FileOutputStream(outfile);
		else out0 = System.out;
		Writer out1 = new OutputStreamWriter(out0, "US-ASCII");
		PrintWriter out = new PrintWriter(out1, true);
		
		main(in, out);
		
		in.close();
		in1.close();
		in0.close();
		out.close();
		out1.close();
		out0.close();
	}
	
}