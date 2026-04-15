import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-black">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <h3 className="mb-4 text-2xl font-bold text-white">BlueTika</h3>
            <p className="mb-4 text-gray-300">
              Find Local Help. Get it Done.
            </p>
            <p className="text-sm text-gray-400">
              100% NZ Owned · Kiwis Helping Kiwis · bluetika.co.nz
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/projects" className="text-gray-300 hover:text-accent">
                  Browse Projects
                </Link>
              </li>
              <li>
                <Link href="/post-project" className="text-gray-300 hover:text-accent">
                  Post a Project
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-300 hover:text-accent">
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/terms" className="text-gray-300 hover:text-accent">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-300 hover:text-accent">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} BlueTika. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}