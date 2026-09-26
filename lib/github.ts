// // Helper utility to pause execution
// // const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// export async function getRepository(username: string, repo: string) {
//   const response = await fetch(
//     `https://api.github.com/repos/${username}/${repo}`,
//   );

//   if (!response.ok) {
//     console.log("STATUS:", response.status);

//     const error = await response.json();
//     console.log("GITHUB ERROR:", error);

//     throw new Error("GitHub request failed");
//   }

//   const data = await response.json();

//   return {
//     name: data.name,
//     fullName: data.full_name,
//     description: data.description,
//     language: data.language,
//     defaultBranch: data.default_branch,
//     url: data.html_url,
//   };
// }
